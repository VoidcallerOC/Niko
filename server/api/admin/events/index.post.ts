import { logActivity, newId, nowIso, putEvent } from '../../../utils/admin/store'
import { applyEventInput } from '../../../utils/admin/validate'

export default defineEventHandler(async (event) => {
  const now = nowIso()
  const next = applyEventInput(null, await readBody(event), now)
  next.id = newId()
  next.createdAt = now
  await putEvent(next)
  await logActivity({ kind: 'create', entity: 'event', entityId: next.id, summary: `Added event ${next.title} (${next.date})` })
  return { event: next }
})
