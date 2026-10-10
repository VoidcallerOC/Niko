import { getSettings } from '../../utils/admin/store'
import { INSTAGRAM_IMPORT } from '../../utils/admin/instagram'

export default defineEventHandler(async () => {
  const settings = await getSettings()
  return {
    status: { source: INSTAGRAM_IMPORT.source, importedAt: INSTAGRAM_IMPORT.importedAt, liveSync: INSTAGRAM_IMPORT.liveSync, lastSyncAttempt: null as string | null, lastSyncError: null as string | null },
    posts: INSTAGRAM_IMPORT.posts.map((p) => ({ ...p, hidden: settings.instagram.hidden.includes(p.id), featured: settings.instagram.featured.includes(p.id) })),
  }
})
