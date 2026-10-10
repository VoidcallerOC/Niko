import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Owner sign-in.
 *
 * - One owner account, no usernames: the password is checked on the server
 *   against a scrypt hash in NUXT_ADMIN_PASSWORD_HASH (make one with
 *   `node scripts/admin-password.mjs`). The browser never sees the hash.
 * - The session is an h3 sealed cookie (iron-webcrypto): HTTP-only, SameSite
 *   Lax, Secure outside dev, 12-hour lifetime, encrypted with
 *   NUXT_SESSION_SECRET. Nothing about the session is readable client-side.
 * - Demo mode (NUXT_ADMIN_DEMO=1) uses the fixed password below and seeds
 *   clearly labelled sample data. It is for previewing the interface only.
 *
 * Pattern reference: Infinite Heroes' `requireAdmin()` (server-side check that
 * redirects to the sign-in page); the Supabase role lookup is replaced with a
 * single owner credential because this site has one owner and no user table.
 */

export const DEMO_PASSWORD = 'demo-nino'
const SESSION_NAME = 'nc_admin'
const SESSION_MAX_AGE = 60 * 60 * 12

export interface AdminSessionData {
  owner?: true
  signedInAt?: string
  demo?: boolean
}

export interface AuthConfig {
  mode: 'password' | 'demo' | 'unconfigured'
  secret: string | null
  reason?: string
}

let generatedSecret: string | null = null

export function authConfig(): AuthConfig {
  const cfg = useRuntimeConfig()
  const demo = String(cfg.adminDemo ?? '') === '1' || String(cfg.adminDemo ?? '') === 'true'
  const hash = String(cfg.adminPasswordHash ?? '')
  let secret = String(cfg.sessionSecret ?? '')

  if (secret.length < 32) {
    if (demo || import.meta.dev) {
      // Preview convenience only: sessions are invalidated on every restart.
      generatedSecret ??= randomBytes(32).toString('hex')
      secret = generatedSecret
    } else {
      return { mode: 'unconfigured', secret: null, reason: 'NUXT_SESSION_SECRET is missing or shorter than 32 characters.' }
    }
  }
  if (demo) return { mode: 'demo', secret }
  if (hash.startsWith('scrypt$')) return { mode: 'password', secret }
  return { mode: 'unconfigured', secret, reason: 'NUXT_ADMIN_PASSWORD_HASH is not set. Run `node scripts/admin-password.mjs` to create one.' }
}

export const isDemo = () => authConfig().mode === 'demo'

export function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  if (!/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(hashHex)) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 })
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function sessionFor(event: H3Event, secret: string) {
  return useSession<AdminSessionData>(event, {
    name: SESSION_NAME,
    password: secret,
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: !import.meta.dev,
      path: '/',
    },
  })
}

/** The owner's session, or null. Never throws for a missing/invalid cookie. */
export async function getOwnerSession(event: H3Event) {
  const cfg = authConfig()
  if (!cfg.secret) return null
  try {
    const session = await sessionFor(event, cfg.secret)
    return session.data.owner ? session : null
  } catch {
    return null
  }
}

export async function requireOwner(event: H3Event) {
  const session = await getOwnerSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Sign in required' })
  return session
}

// Sign-in attempts: 5 failures per IP per 15 minutes, in memory.
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5

function clientKey(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

export function loginAllowed(event: H3Event) {
  const entry = attempts.get(clientKey(event))
  if (!entry) return true
  if (Date.now() > entry.resetAt) {
    attempts.delete(clientKey(event))
    return true
  }
  return entry.count < MAX_FAILURES
}

export function recordFailure(event: H3Event) {
  const key = clientKey(event)
  const entry = attempts.get(key)
  if (!entry || Date.now() > entry.resetAt) attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS })
  else entry.count += 1
}

export function clearFailures(event: H3Event) {
  attempts.delete(clientKey(event))
}

export async function signIn(event: H3Event, password: string) {
  const cfg = authConfig()
  if (cfg.mode === 'unconfigured' || !cfg.secret) {
    throw createError({ statusCode: 503, statusMessage: cfg.reason ?? 'Sign-in is not configured.' })
  }
  if (!loginAllowed(event)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Wait 15 minutes and try again.' })
  }
  const ok = cfg.mode === 'demo'
    ? password === DEMO_PASSWORD
    : verifyPassword(password, String(useRuntimeConfig().adminPasswordHash))
  if (!ok) {
    recordFailure(event)
    throw createError({ statusCode: 401, statusMessage: 'Wrong password.' })
  }
  clearFailures(event)
  const session = await sessionFor(event, cfg.secret)
  await session.clear()
  await session.update({ owner: true, signedInAt: new Date().toISOString(), demo: cfg.mode === 'demo' })
  return session
}

export async function signOut(event: H3Event) {
  const cfg = authConfig()
  if (!cfg.secret) return
  try {
    const session = await sessionFor(event, cfg.secret)
    await session.clear()
  } catch {
    // Nothing to clear.
  }
}

/**
 * Mutations must come from this site. Browsers always send Origin or
 * Sec-Fetch-Site on cross-site requests; same-site XHR carries matching values.
 */
export function assertSameOrigin(event: H3Event) {
  const method = event.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return
  const fetchSite = getRequestHeader(event, 'sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request blocked' })
  }
  const origin = getRequestHeader(event, 'origin')
  if (origin) {
    const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || ''
    let originHost = ''
    try {
      originHost = new URL(origin).host
    } catch {
      originHost = ''
    }
    if (!host || originHost !== host) throw createError({ statusCode: 403, statusMessage: 'Cross-site request blocked' })
  }
}
