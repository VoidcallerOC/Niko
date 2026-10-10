import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { getOwner, type OwnerAccount } from './owner'
import { isDemoEnv, sessionSecretSync, storageStatus } from './runtime'

/**
 * Owner sign-in.
 *
 * - One owner account, created by Nino on his first visit (see owner.ts and
 *   /api/admin/auth/setup). Email + password checked on the server against an
 *   scrypt hash; or Sign in with Square once he has linked his Square account.
 * - The session is an h3 sealed cookie: HTTP-only, SameSite Lax, Secure
 *   outside dev, 12-hour lifetime. It carries the owner id and a session
 *   version, both re-checked against the stored owner on every request.
 * - Demo mode (NUXT_ADMIN_DEMO=1) uses a fixed password and in-memory SAMPLE
 *   data; it never touches the real store.
 *
 * Pattern reference: Infinite Heroes' `requireAdmin()` (server-side check that
 * redirects to the sign-in page), with a single owner instead of a user table.
 */

export const DEMO_PASSWORD = 'demo-nino'
const SESSION_NAME = 'nc_admin'
const SESSION_MAX_AGE = 60 * 60 * 12

export interface AdminSessionData {
  owner?: true
  ownerId?: string
  sessionVersion?: number
  signedInAt?: string
  demo?: boolean
  via?: 'password' | 'square'
  email?: string
  /** Square OAuth round trip in flight. */
  oauthState?: string
  oauthNext?: string
  oauthIntent?: 'connect' | 'signin'
}

export interface AuthConfig {
  /** demo → sample data; owner → the real owner account; unconfigured → see reason. */
  mode: 'demo' | 'owner' | 'unconfigured'
  secret: string | null
  reason?: string
}

export const isDemo = () => isDemoEnv()

/** Call after ensureSessionSecret() (the admin-guard middleware does this). */
export function authConfig(): AuthConfig {
  const storage = storageStatus()
  if (storage.problem) return { mode: 'unconfigured', secret: null, reason: storage.problem }
  const secret = sessionSecretSync()
  if (secret.length < 32) return { mode: 'unconfigured', secret: null, reason: 'The session secret is not ready. Reload the page.' }
  return { mode: isDemoEnv() ? 'demo' : 'owner', secret }
}

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

export function sessionFor(event: H3Event, secret: string) {
  return useSession<AdminSessionData>(event, {
    name: SESSION_NAME,
    password: secret,
    maxAge: SESSION_MAX_AGE,
    cookie: { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/' },
  })
}

/**
 * The owner's session, or null. Never throws for a missing or invalid cookie.
 * Outside demo mode the cookie must name the current owner account and its
 * current session version, so a reset account or a changed password ends
 * every older session.
 */
export async function getOwnerSession(event: H3Event) {
  const cfg = authConfig()
  if (!cfg.secret) return null
  try {
    const session = await sessionFor(event, cfg.secret)
    if (!session.data.owner) return null
    if (cfg.mode === 'demo') return session.data.demo ? session : null
    if (session.data.demo) return null
    const owner = await getOwner()
    if (!owner || owner.id !== session.data.ownerId || owner.sessionVersion !== session.data.sessionVersion) return null
    return session
  } catch {
    return null
  }
}

export async function requireOwner(event: H3Event) {
  const session = await getOwnerSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Sign in required' })
  return session
}

// --- Attempt limits (kept in the admin store so every instance shares them) --
const WINDOW_SECONDS = 15 * 60
const MAX_FAILURES = 5

function clientKey(event: H3Event, scope: string) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  return `ratelimit:${scope}:${createHash('sha256').update(ip).digest('hex').slice(0, 24)}`
}

interface Counter {
  count: number
  resetAt: number
}

async function readCounter(key: string): Promise<Counter | null> {
  const c = await useStorage('admin').getItem<Counter>(key)
  if (!c || Date.now() > c.resetAt) return null
  return c
}

async function bump(key: string, windowSeconds: number) {
  const c = await readCounter(key)
  const next: Counter = c ? { count: c.count + 1, resetAt: c.resetAt } : { count: 1, resetAt: Date.now() + windowSeconds * 1000 }
  await useStorage('admin').setItem(key, next, { ttl: windowSeconds })
}

export async function assertAttemptsAllowed(event: H3Event, scope = 'login') {
  const c = await readCounter(clientKey(event, scope))
  if (c && c.count >= MAX_FAILURES) throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Wait 15 minutes and try again.' })
}
export const recordFailure = (event: H3Event, scope = 'login') => bump(clientKey(event, scope), WINDOW_SECONDS)
export const clearFailures = (event: H3Event, scope = 'login') => useStorage('admin').removeItem(clientKey(event, scope))

/** Site-wide cap on wrong setup codes, so rotating IP addresses does not help. */
const SETUP_GLOBAL_KEY = 'ratelimit:setup:global'
const SETUP_GLOBAL_MAX = 20
const SETUP_GLOBAL_WINDOW = 60 * 60
export async function assertSetupNotLocked() {
  const c = await readCounter(SETUP_GLOBAL_KEY)
  if (c && c.count >= SETUP_GLOBAL_MAX) throw createError({ statusCode: 429, statusMessage: 'Setup is locked for an hour after too many wrong codes.' })
}
export const recordSetupFailure = () => bump(SETUP_GLOBAL_KEY, SETUP_GLOBAL_WINDOW)

// --- Signing in ---------------------------------------------------------------
async function startSession(event: H3Event, data: AdminSessionData) {
  const cfg = authConfig()
  if (!cfg.secret) throw createError({ statusCode: 503, statusMessage: cfg.reason ?? 'Sign-in is not configured.' })
  const session = await sessionFor(event, cfg.secret)
  await session.clear()
  await session.update({ owner: true, signedInAt: new Date().toISOString(), ...data })
  return session
}

export const signInAsOwner = (event: H3Event, owner: OwnerAccount, via: 'password' | 'square') =>
  startSession(event, { ownerId: owner.id, sessionVersion: owner.sessionVersion, email: owner.email, via, demo: false })

/** Email + password. Demo mode takes the demo password instead. */
export async function signInWithPassword(event: H3Event, email: string, password: string) {
  const cfg = authConfig()
  if (cfg.mode === 'unconfigured') throw createError({ statusCode: 503, statusMessage: cfg.reason ?? 'Sign-in is not configured.' })
  await assertAttemptsAllowed(event)
  if (cfg.mode === 'demo') {
    if (password !== DEMO_PASSWORD) {
      await recordFailure(event)
      throw createError({ statusCode: 401, statusMessage: 'Wrong password.' })
    }
    await clearFailures(event)
    return startSession(event, { demo: true, via: 'password', email: 'demo' })
  }
  const owner = await getOwner()
  if (!owner) throw createError({ statusCode: 409, statusMessage: 'The owner account has not been created yet.' })
  const ok = owner.email.toLowerCase() === email.trim().toLowerCase() && verifyPassword(password, owner.passwordHash)
  if (!ok) {
    await recordFailure(event)
    throw createError({ statusCode: 401, statusMessage: 'Wrong email or password.' })
  }
  await clearFailures(event)
  return signInAsOwner(event, owner, 'password')
}

/** Cookie for a visitor who is not signed in yet (holds the OAuth state). */
export async function anonymousSession(event: H3Event) {
  const cfg = authConfig()
  if (!cfg.secret) throw createError({ statusCode: 503, statusMessage: cfg.reason ?? 'Sign-in is not configured.' })
  return sessionFor(event, cfg.secret)
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
