import { randomBytes } from 'node:crypto'
import fsDriver from 'unstorage/drivers/fs'

/**
 * Mount the admin store at runtime so the location follows the environment
 * (NUXT_ADMIN_DATA_DIR) rather than being fixed at build time.
 *
 * Preview: filesystem. Vercel's function filesystem is ephemeral, so before
 * real inventory goes in, swap this driver for a durable one (Vercel Blob/KV,
 * Redis, S3: see https://unstorage.unjs.io/drivers) with its credentials in
 * server env vars. Every reader goes through useStorage('admin'), so only
 * this file changes.
 *
 * Session secret: NUXT_SESSION_SECRET when set; otherwise one is generated on
 * first start and kept in the store, so nothing has to be configured before
 * Nino's first sign-in. (On an ephemeral filesystem that secret is regenerated
 * on each cold start, which only signs everyone out.)
 */
export default defineNitroPlugin(async () => {
  const base = process.env.NUXT_ADMIN_DATA_DIR || '.data/admin'
  useStorage().mount('admin', fsDriver({ base }))

  const configured = String(useRuntimeConfig().sessionSecret || '')
  if (configured.length >= 32) return
  const store = useStorage('admin')
  let secret = await store.getItem<string>('session:secret').catch(() => null)
  if (typeof secret !== 'string' || secret.length < 32) {
    secret = randomBytes(32).toString('hex')
    await store.setItem('session:secret', secret)
  }
  ;(globalThis as { __ncSessionSecret?: string }).__ncSessionSecret = secret
})
