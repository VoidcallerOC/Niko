import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { envSessionSecret, isDemoEnv } from './runtime'

/**
 * Square OAuth (official): https://developer.squareup.com/docs/oauth-api/overview
 *
 * Connect (from inside the admin, owner signed in):
 *   /api/admin/auth/square/start → Square's authorize page → Nino approves on
 *   Square's own site (his Square password never touches this app) →
 *   /api/admin/auth/square/callback exchanges the code on the server, reads the
 *   merchant, owner email and main location, and stores the tokens sealed with
 *   AES-256-GCM under a key derived from NUXT_SESSION_SECRET. That key is an
 *   environment variable, never written to the store, so a copy of the
 *   database alone does not reveal the tokens. The browser never sees a token.
 *
 * Sign in with Square (signed out): same round trip; accepted only for the
 * merchant already linked to the owner account.
 *
 * Demo mode never contacts Square: a labelled SAMPLE identity stands in.
 *
 * Env: NUXT_SQUARE_APP_ID, NUXT_SQUARE_APP_SECRET, NUXT_SQUARE_ENV
 * (sandbox|production), NUXT_SESSION_SECRET, optional NUXT_SQUARE_REDIRECT_URL.
 * NUXT_SQUARE_API_ORIGIN / NUXT_SQUARE_AUTHORIZE_URL exist only so the flow
 * can be tested against a local mock; leave them unset on Vercel.
 */

export const SQUARE_SCOPES = ['MERCHANT_PROFILE_READ', 'EMPLOYEES_READ', 'ITEMS_READ', 'ITEMS_WRITE', 'INVENTORY_READ', 'INVENTORY_WRITE']
export const SQUARE_VERSION = '2025-01-23'

export interface SquareIdentity {
  merchantId: string
  businessName: string
  /** Owner's email from the Team Members API; '' when not available. */
  email: string
  locationId: string
  locationName: string
  source: 'square' | 'demo'
}

export interface SquareConnection {
  /** Sealed access + refresh tokens (see seal/unseal). Empty for demo. */
  sealed: string
  expiresAt: string
  merchantId: string
  businessName: string
  email: string
  locationId: string
  locationName: string
  connectedAt: string
  source: 'square' | 'demo'
}

interface Tokens {
  accessToken: string
  refreshToken: string
}

export function squareAuthConfig() {
  const cfg = useRuntimeConfig()
  const env = String(cfg.square?.env || 'production') === 'sandbox' ? 'sandbox' : 'production'
  return {
    appId: String(cfg.square?.appId || ''),
    appSecret: String(cfg.square?.appSecret || ''),
    env,
    redirectUrl: String(cfg.square?.redirectUrl || ''),
    api: process.env.NUXT_SQUARE_API_ORIGIN || (env === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'),
    authorize: process.env.NUXT_SQUARE_AUTHORIZE_URL || (env === 'sandbox' ? 'https://app.squareupsandbox.com/oauth2/authorize' : 'https://connect.squareup.com/oauth2/authorize'),
  }
}

/** What is still missing before a real Square account can be connected. Names only, never values. */
export function squareSetupProblems(): string[] {
  const { appId, appSecret } = squareAuthConfig()
  const missing: string[] = []
  if (!appId) missing.push('NUXT_SQUARE_APP_ID')
  if (!appSecret) missing.push('NUXT_SQUARE_APP_SECRET')
  if (!envSessionSecret()) missing.push('NUXT_SESSION_SECRET (32+ characters; seals the Square tokens)')
  return missing
}

export const squareIsDemo = () => isDemoEnv()

export function redirectUrlFor(event: H3Event) {
  const configured = squareAuthConfig().redirectUrl
  if (configured) return configured
  const proto = getRequestHeader(event, 'x-forwarded-proto') || (import.meta.dev ? 'http' : 'https')
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || 'localhost'
  return `${proto}://${host}/api/admin/auth/square/callback`
}

export function authorizeUrl(state: string, redirectUri: string) {
  const { appId, authorize } = squareAuthConfig()
  const params = new URLSearchParams({ client_id: appId, scope: SQUARE_SCOPES.join(' '), session: 'false', state, redirect_uri: redirectUri })
  return `${authorize}?${params}`
}

// --- Token sealing (key from the environment, never stored) -----------------
function key() {
  const secret = envSessionSecret()
  if (!secret) throw createError({ statusCode: 503, statusMessage: 'NUXT_SESSION_SECRET must be set before Square can be connected.' })
  return createHash('sha256').update(`square-tokens:${secret}`).digest()
}

export function seal(tokens: Tokens) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString('base64url')).join('.')
}

export function unseal(sealed: string): Tokens {
  const [ivB, tagB, bodyB] = sealed.split('.')
  if (!ivB || !tagB || !bodyB) throw new Error('Bad sealed token')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'))
  const json = Buffer.concat([decipher.update(Buffer.from(bodyB, 'base64url')), decipher.final()]).toString('utf8')
  return JSON.parse(json) as Tokens
}

// --- Connection record ------------------------------------------------------
const storage = () => useStorage('admin')
export const getConnection = () => storage().getItem<SquareConnection>('square:connection')
export const putConnection = (c: SquareConnection) => storage().setItem('square:connection', c)
export const removeConnection = () => storage().removeItem('square:connection')

// --- Square HTTP ------------------------------------------------------------
async function squareJson<T>(path: string, init: { method?: string; body?: unknown; token?: string; auth?: string }): Promise<T> {
  const { api } = squareAuthConfig()
  const res = await fetch(`${api}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : init.auth ? { Authorization: init.auth } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as { errors?: Array<{ detail?: string; code?: string }>; message?: string } & T
  if (!res.ok) {
    const detail = json.errors?.map((e) => e.detail || e.code).join('; ') || json.message || `Square responded ${res.status}`
    throw createError({ statusCode: 502, statusMessage: `Square: ${detail}` })
  }
  return json
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_at?: string
  merchant_id?: string
}

export async function exchangeCode(code: string, redirectUri: string) {
  const { appId, appSecret } = squareAuthConfig()
  const t = await squareJson<TokenResponse>('/oauth2/token', {
    method: 'POST',
    body: { client_id: appId, client_secret: appSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri },
  })
  return { accessToken: t.access_token, refreshToken: t.refresh_token ?? '', expiresAt: t.expires_at ?? '', merchantId: t.merchant_id ?? '' }
}

export async function refreshTokens(refreshToken: string) {
  const { appId, appSecret } = squareAuthConfig()
  const t = await squareJson<TokenResponse>('/oauth2/token', {
    method: 'POST',
    body: { client_id: appId, client_secret: appSecret, refresh_token: refreshToken, grant_type: 'refresh_token' },
  })
  return { accessToken: t.access_token, refreshToken: t.refresh_token ?? refreshToken, expiresAt: t.expires_at ?? '' }
}

/** Revoke this app's access for the merchant. Returns false if Square refused or was unreachable. */
export async function revokeTokens(accessToken: string) {
  const { appId, appSecret } = squareAuthConfig()
  try {
    await squareJson('/oauth2/revoke', { method: 'POST', auth: `Client ${appSecret}`, body: { client_id: appId, access_token: accessToken } })
    return true
  } catch {
    return false
  }
}

/** Business name, owner email and main location for the merchant behind a token. */
export async function fetchIdentity(accessToken: string, merchantIdHint = ''): Promise<SquareIdentity> {
  const me = await squareJson<{ merchant?: { id?: string; business_name?: string; main_location_id?: string } }>('/v2/merchants/me', { token: accessToken })
  const merchantId = me.merchant?.id || merchantIdHint
  if (!merchantId) throw createError({ statusCode: 502, statusMessage: 'Square did not say which merchant this is.' })

  let email = ''
  try {
    const team = await squareJson<{ team_members?: Array<{ is_owner?: boolean; email_address?: string }> }>('/v2/team-members/search', {
      method: 'POST',
      token: accessToken,
      body: { query: { filter: { status: 'ACTIVE' } }, limit: 100 },
    })
    email = team.team_members?.find((m) => m.is_owner)?.email_address ?? ''
  } catch {
    email = '' // EMPLOYEES_READ not granted; the merchant id still identifies him.
  }

  let locationId = me.merchant?.main_location_id ?? ''
  let locationName = ''
  try {
    const locs = await squareJson<{ locations?: Array<{ id: string; name?: string; status?: string }> }>('/v2/locations', { token: accessToken })
    const active = locs.locations?.filter((l) => l.status !== 'INACTIVE') ?? []
    const main = active.find((l) => l.id === locationId) ?? active[0]
    if (main) {
      locationId = main.id
      locationName = main.name ?? ''
    }
  } catch {
    // Keep whatever the merchant record said.
  }
  return { merchantId, businessName: me.merchant?.business_name ?? '', email, locationId, locationName, source: 'square' }
}

export const DEMO_IDENTITY: SquareIdentity = {
  merchantId: 'SAMPLE-MERCHANT-0001',
  businessName: "SAMPLE Nino's Collectibles",
  email: 'sample-owner@example.com',
  locationId: 'SAMPLE-LOCATION-0001',
  locationName: 'SAMPLE Main location',
  source: 'demo',
}

/**
 * A usable access token for the Square APIs, refreshed when it is within a
 * week of expiry. Null when no real Square account is connected.
 */
export async function connectedAccessToken(): Promise<{ token: string; locationId: string } | null> {
  if (isDemoEnv()) return null
  const conn = await getConnection()
  if (!conn || conn.source !== 'square' || !conn.sealed) return null
  let tokens: Tokens
  try {
    tokens = unseal(conn.sealed)
  } catch {
    return null
  }
  const expires = conn.expiresAt ? new Date(conn.expiresAt).getTime() : 0
  if (expires && expires - Date.now() < 7 * 24 * 3600 * 1000 && tokens.refreshToken) {
    const fresh = await refreshTokens(tokens.refreshToken)
    tokens = { accessToken: fresh.accessToken, refreshToken: fresh.refreshToken }
    await putConnection({ ...conn, sealed: seal(tokens), expiresAt: fresh.expiresAt || conn.expiresAt })
  }
  return { token: tokens.accessToken, locationId: conn.locationId }
}
