import { getEvent, logActivity, nowIso, putEvent } from '../../../../utils/admin/store'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const current = await getEvent(id)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  await putEvent({ ...current, deletedAt: null, updatedAt: nowIso() })
  await logActivity({ kind: 'restore', entity: 'event', entityId: id, summary: `Restored event ${current.title}` })
  return { ok: true }
})
