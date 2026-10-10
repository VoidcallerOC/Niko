import { getProduct, logActivity, nowIso, putProduct } from '../../../utils/admin/store'

/** Soft delete: the card moves to Trash and can be restored. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const current = await getProduct(id)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Card not found' })
  const now = nowIso()
  await putProduct({ ...current, deletedAt: now, updatedAt: now })
  await logActivity({ kind: 'delete', entity: 'product', entityId: id, summary: `Moved ${current.title || 'untitled card'} to trash` })
  return { ok: true }
})
