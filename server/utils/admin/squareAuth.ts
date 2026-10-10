import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { isDemo } from './auth'

/**
 * Square OAuth (official): https://developer.squareup.com/docs/oauth-api/overview
 *
 *  1. /api/admin/auth/square/start   → redirect to Square's authorize page with
 *     a random `state` kept in the sealed session cookie.
 *  2. Nino approves; Square sends him back to
 *     /api/admin/auth/square/callback?code=…&state=…
 *  3. The server exchanges the code for tokens using the app secret (server
 *     only), reads who the merchant is (business name, owner email, main
 *     location), stores the tokens sealed with NUXT_SESSION_SECRET, and signs
 *     him in. The browser never sees a token.
 *
 * Owner binding: the first Square account to complete this flow becomes the
 * owner (merchant id + owner email are stored). Later sign-ins must match it.
 *
 * Env: NUXT_SQUARE_APP_ID, NUXT_SQUARE_APP_SECRET, NUXT_SQUARE_ENV
 * (sandbox|production), optional NUXT_SQUARE_REDIRECT_URL (defaults to this
 * site's /api/admin/auth/square/callback, which must be registered in the
 * Square developer dashboard).
 */

export const SQUARE_SCOPES = ['MERCHANT_PROFILE_READ', 'EMPLOYEES_READ', 'ITEMS_READ', 'ITEMS_WRITE', 'INVENTORY_READ', 'INVENTORY_WRITE']
export const SQUARE_VERSION = '2025-01-23'

export interface SquareIdentity {
  merchantId: string
  businessName: string
  /** Owner's email from the Team Members API, '' when the scope was not granted. */
  email: string
  locationId: string
  locationName: string
  /** 'demo' identities are labelled samples; never a real account. */
  source: 'square' | 'demo'
}

/**
 * The one owner account. Created the first time anyone completes setup
 * (email + password chosen by Nino) or Sign in with Square. Both halves can
 * exist: a password owner can later link his Square account, and a Square
 * owner can add a password in Settings.
 */
export interface OwnerBinding {
  /** Square merchant id once Square is linked, '' before that. */
  merchantId: string
  email: string
  businessName: string
  /** scrypt hash when a password was set, absent for Square-only owners. */
  passwordHash?: string
  boundAt: string
  source: 'square' | 'password' | 'demo'
}

export interface SquareConnection {
  /** Sealed (AES-256-GCM) access + refresh tokens; see seal()/unseal(). */
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
  const appId = String(cfg.square?.appId || process.env.SQUARE_APPLICATION_ID || '')
  const appSecret = String(cfg.square?.appSecret || process.env.SQUARE_APPLICATION_SECRET || '')
  const env = String(cfg.square?.env || process.env.SQUARE_ENV || 'production')
  const redirectUrl = String(cfg.square?.redirectUrl || '')
  return {
    appId,
    appSecret,
    env,
    redirectUrl,
    api: env === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com',
    authorize: env === 'sandbox' ? 'https://app.squareupsandbox.com/oauth2/authorize' : 'https://connect.squareup.com/oauth2/authorize',
  }
}

/** Real Square sign-in needs an app id and secret. Demo mode offers a labelled stand-in. */
export function squareLoginAvailable() {
  const { appId, appSecret } = squareAuthConfig()
  return (!!appId && !!appSecret) || isDemo()
}

export function squareLoginIsDemo() {
  const { appId, appSecret } = squareAuthConfig()
  return isDemo() && !(appId && appSecret)
}

export function redirectUrlFor(event: H3Event) {
  const configured = squareAuthConfig().redirectUrl
  if (configured) return configured
  const proto = getRequestHeader(event, 'x-forwarded-proto') || (import.meta.dev ? 'http' : 'https')
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || 'localhost'
  return `${proto}://${host}/api/admin/auth/square/callback`
}

export function authorizeUrl(state: string, redirectUri: string) {
  const { appId, authorize } = squareAuthConfig()
  const params = new URLSearchParams({
    client_id: appId,
    scope: SQUARE_SCOPES.join(' '),
    session: 'false',
    state,
    redirect_uri: redirectUri,
  })
  return `${authorize}?${params}`
}

// --- Token sealing --------------------------------------------------------
function key() {
  const secret = String(useRuntimeConfig().sessionSecret || '')
  if (secret.length < 32) throw createError({ statusCode: 503, statusMessage: 'NUXT_SESSION_SECRET is required to store Square tokens.' })
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

// --- Storage ----------------------------------------------------------------
const storage = () => useStorage('admin')
export const getOwnerBinding = () => storage().getItem<OwnerBinding>('owner')
export const putOwnerBinding = (b: OwnerBinding) => storage().setItem('owner', b)
export const getConnection = () => storage().getItem<SquareConnection>('square:connection')
export const putConnection = (c: SquareConnection) => storage().setItem('square:connection', c)
export const removeConnection = () => storage().removeItem('square:connection')

/**
 * Who may sign in with Square.
 *  - No owner yet: this account becomes the owner.
 *  - Owner without Square: link it when the Square owner email matches the
 *    owner's email, or when the owner is already signed in (linking from Settings).
 *  - Owner with Square: merchant id must match, and the email too when both are known.
 */
export function checkOwnerBinding(
  existing: OwnerBinding | null,
  identity: SquareIdentity,
  signedInOwner = false,
): { ok: true; first: boolean; link: boolean } | { ok: false; reason: string } {
  if (!existing) return { ok: true, first: true, link: false }
  const sameEmail = !!existing.email && !!identity.email && existing.email.toLowerCase() === identity.email.toLowerCase()
  if (!existing.merchantId) {
    if (signedInOwner || sameEmail) return { ok: true, first: false, link: true }
    return { ok: false, reason: 'That Square account does not match the owner email on file. Sign in with your password first, then link Square in Settings.' }
  }
  if (existing.merchantId !== identity.merchantId) return { ok: false, reason: 'That Square account is not the owner account for this site.' }
  if (existing.email && identity.email && !sameEmail) {
    return { ok: false, reason: 'That Square sign-in does not match the owner email on file.' }
  }
  return { ok: true, first: false, link: false }
}

// --- Square HTTP ------------------------------------------------------------
async function squareJson<T>(path: string, init: { method?: string; body?: unknown; token?: string }): Promise<T> {
  const { api } = squareAuthConfig()
  const res = await fetch(`${api}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
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

export async function revokeTokens(accessToken: string) {
  const { appId, appSecret, api } = squareAuthConfig()
  await fetch(`${api}/oauth2/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': SQUARE_VERSION, Authorization: `Client ${appSecret}` },
    body: JSON.stringify({ client_id: appId, access_token: accessToken }),
  }).catch(() => undefined)
}

/** Business name, owner email and main location for the merchant behind a token. */
export async function fetchIdentity(accessToken: string, merchantIdHint = ''): Promise<SquareIdentity> {
  const me = await squareJson<{ merchant?: { id?: string; business_name?: string; main_location_id?: string } }>('/v2/merchants/me', { token: accessToken })
  const merchantId = me.merchant?.id || merchantIdHint
  if (!merchantId) throw createError({ statusCode: 502, statusMessage: 'Square did not say which merchant this is.' })

  let email = ''
  try {
    const team = await squareJson<{ team_members?: Array<{ is_owner?: boolean; email_address?: string; status?: string }> }>('/v2/team-members/search', {
      method: 'POST',
      token: accessToken,
      body: { query: { filter: { status: 'ACTIVE' } }, limit: 100 },
    })
    email = team.team_members?.find((m) => m.is_owner)?.email_address ?? ''
  } catch {
    email = '' // EMPLOYEES_READ not granted; merchant id still binds the owner.
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
 * week of expiry. Null when Square is not connected through OAuth.
 */
export async function connectedAccessToken(): Promise<{ token: string; locationId: string } | null> {
  const conn = await getConnection()
  if (!conn || conn.source === 'demo') return null
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
