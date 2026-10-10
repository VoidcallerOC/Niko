import { getEvent, logActivity, nowIso, putEvent } from '../../../utils/admin/store'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const current = await getEvent(id)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  const now = nowIso()
  await putEvent({ ...current, deletedAt: now, updatedAt: now })
  await logActivity({ kind: 'delete', entity: 'event', entityId: id, summary: `Moved event ${current.title} to trash` })
  return { ok: true }
})
