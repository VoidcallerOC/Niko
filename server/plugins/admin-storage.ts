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
 */
export default defineNitroPlugin(() => {
  const base = process.env.NUXT_ADMIN_DATA_DIR || '.data/admin'
  useStorage().mount('admin', fsDriver({ base }))
})
