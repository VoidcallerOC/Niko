import fsDriver from 'unstorage/drivers/fs'
import memoryDriver from 'unstorage/drivers/memory'
import redisDriver from 'unstorage/drivers/redis'
import { chooseBackend, redisUrl, setStorageStatus } from '../utils/admin/runtime'

/**
 * Mount the admin store. Every admin reader and writer goes through
 * useStorage('admin'), so this is the only place that knows the backend.
 * See server/utils/admin/runtime.ts for how the backend is chosen.
 */
export default defineNitroPlugin(() => {
  const status = chooseBackend()
  setStorageStatus(status)
  const storage = useStorage()

  if (status.backend === 'redis') {
    storage.mount('admin', redisDriver({
      url: redisUrl(),
      base: 'ninos:admin',
      // Serverless-friendly: fail fast instead of queueing forever.
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      enableReadyCheck: true,
    }))
  } else if (status.backend === 'fs') {
    storage.mount('admin', fsDriver({ base: process.env.NUXT_ADMIN_DATA_DIR || '.data/admin' }))
  } else {
    // Demo, or Vercel without Redis: memory only. Demo data is SAMPLE-only and
    // never touches the real store; without Redis the admin is locked anyway.
    storage.mount('admin', memoryDriver())
  }

  if (status.problem) console.warn(`[admin] ${status.problem}`)
  else console.info(`[admin] storage: ${status.label}`)
})
