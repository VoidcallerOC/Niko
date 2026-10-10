import { randomBytes } from 'node:crypto'

/**
 * Where admin data lives, and the server's session secret.
 *
 * Storage backends (chosen in server/plugins/admin-storage.ts):
 *   demo   → in-memory only. Demo mode never reads or writes real data, and
 *            its SAMPLE records vanish on restart.
 *   redis  → REDIS_URL (or KV_URL). Durable and shared by every Vercel
 *            function instance. Both Vercel Marketplace Redis integrations
 *            (Redis and Upstash) provide this variable.
 *   fs     → .data/admin on local disk. Development only; never chosen on Vercel.
 *   none   → running on Vercel without REDIS_URL. Function disks are wiped
 *            between invocations, so the admin refuses setup and sign-in
 *            rather than lose the owner account and inventory.
 */
export type StorageBackend = 'demo' | 'redis' | 'fs' | 'none'

export interface StorageStatus {
  backend: StorageBackend
  /** True when records survive restarts and redeploys. */
  durable: boolean
  /** Human-readable reason the admin cannot be used for real data, or null. */
  problem: string | null
  label: string
}

const g = globalThis as { __ncStorage?: StorageStatus; __ncSecret?: Promise<string> | string; __ncDemoWarned?: boolean }

/**
 * Demo mode is for local previews and Vercel preview deployments only. It is
 * ignored on the production deployment, so a stray NUXT_ADMIN_DEMO can never
 * put SAMPLE cards on the live homepage or open the admin with the demo password.
 */
export function isDemoEnv() {
  const v = String(useRuntimeConfig().adminDemo ?? process.env.NUXT_ADMIN_DEMO ?? '')
  if (v !== '1' && v !== 'true') return false
  if (process.env.VERCEL_ENV === 'production') {
    if (!g.__ncDemoWarned) console.warn('[admin] NUXT_ADMIN_DEMO is ignored on the production deployment.')
    g.__ncDemoWarned = true
    return false
  }
  return true
}

export const onVercel = () => process.env.VERCEL === '1' || !!process.env.VERCEL_ENV

export function redisUrl() {
  return process.env.REDIS_URL || process.env.KV_URL || ''
}

export function chooseBackend(): StorageStatus {
  if (isDemoEnv()) {
    return { backend: 'demo', durable: false, problem: null, label: 'Demo memory (SAMPLE data, resets on restart)' }
  }
  if (redisUrl()) {
    // On Vercel the cookie/token key must come from the environment, never from a generated value.
    const problem = onVercel() && !envSessionSecret()
      ? 'NUXT_SESSION_SECRET is not set. Nick needs to add it (32+ random characters) to the Vercel project and redeploy.'
      : null
    return { backend: 'redis', durable: true, problem, label: 'Redis (durable)' }
  }
  if (onVercel()) {
    return {
      backend: 'none',
      durable: false,
      problem: 'Durable storage is not connected. Nick needs to connect a Redis database to the Vercel project (Storage → Redis or Upstash) so REDIS_URL is set, then redeploy.',
      label: 'Not configured',
    }
  }
  return { backend: 'fs', durable: true, problem: null, label: 'Local disk (development only)' }
}

export function setStorageStatus(s: StorageStatus) {
  g.__ncStorage = s
}

export function storageStatus(): StorageStatus {
  return g.__ncStorage ?? chooseBackend()
}

/** NUXT_SESSION_SECRET when it is long enough, else ''. */
export function envSessionSecret() {
  const s = String(useRuntimeConfig().sessionSecret || '')
  return s.length >= 32 ? s : ''
}

/**
 * The secret that seals session cookies. NUXT_SESSION_SECRET when set;
 * otherwise generated once and kept in the admin store so it survives
 * restarts (or kept in memory for demo mode). The admin-guard middleware
 * awaits this before any admin request runs.
 */
export function ensureSessionSecret(): Promise<string> {
  const fromEnv = envSessionSecret()
  if (fromEnv) return Promise.resolve(fromEnv)
  if (typeof g.__ncSecret === 'string') return Promise.resolve(g.__ncSecret)
  if (g.__ncSecret) return g.__ncSecret
  const load = (async () => {
    if (storageStatus().backend === 'demo' || storageStatus().backend === 'none') return randomBytes(32).toString('hex')
    const store = useStorage('admin')
    const existing = await store.getItem<string>('session:secret')
    if (typeof existing === 'string' && existing.length >= 32) return existing
    await store.setItem('session:secret', randomBytes(32).toString('hex'))
    // Read back: if two instances raced, both settle on whichever write landed.
    const settled = await store.getItem<string>('session:secret')
    if (typeof settled !== 'string' || settled.length < 32) throw new Error('Could not store the session secret')
    return settled
  })()
  g.__ncSecret = load
  load.then((s) => (g.__ncSecret = s)).catch(() => (g.__ncSecret = undefined))
  return load
}

/** Synchronous view once ensureSessionSecret() has resolved; '' before that. */
export function sessionSecretSync() {
  return envSessionSecret() || (typeof g.__ncSecret === 'string' ? g.__ncSecret : '')
}
