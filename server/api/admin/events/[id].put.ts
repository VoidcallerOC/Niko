import { getEvent, logActivity, nowIso, putEvent, saveRevision } from '../../../utils/admin/store'
import { applyEventInput } from '../../../utils/admin/validate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const current = await getEvent(id)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  const next = applyEventInput(current, await readBody(event), nowIso())
  await saveRevision('event', id, current)
  await putEvent(next)
  await logActivity({ kind: 'update', entity: 'event', entityId: id, summary: `Updated event ${next.title}` })
  return { event: next }
})
