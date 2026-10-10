import { getSettings, logActivity, nowIso, putSettings, saveRevision } from '../../utils/admin/store'
import { INSTAGRAM_IMPORT } from '../../utils/admin/instagram'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: unknown; hidden?: unknown; featured?: unknown }>(event)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!INSTAGRAM_IMPORT.posts.some((p) => p.id === id)) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  const current = await getSettings()
  const set = (list: string[], on: boolean) => (on ? Array.from(new Set([...list, id])) : list.filter((x) => x !== id))
  const next = {
    ...current,
    instagram: {
      hidden: body.hidden === undefined ? current.instagram.hidden : set(current.instagram.hidden, Boolean(body.hidden)),
      featured: body.featured === undefined ? current.instagram.featured : set(current.instagram.featured, Boolean(body.featured)),
    },
    updatedAt: nowIso(),
  }
  await saveRevision('settings', 'site', current)
  await putSettings(next)
  await logActivity({ kind: 'instagram', entity: 'instagram', entityId: id, summary: `Instagram post ${id}: ${body.hidden !== undefined ? (body.hidden ? 'hidden' : 'shown') : body.featured ? 'featured' : 'unfeatured'}` })
  return { instagram: next.instagram }
})
