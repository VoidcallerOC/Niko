import { getProduct, logActivity, nowIso, putProduct } from '../../../../utils/admin/store'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const current = await getProduct(id)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Card not found' })
  const now = nowIso()
  await putProduct({ ...current, deletedAt: null, updatedAt: now })
  await logActivity({ kind: 'restore', entity: 'product', entityId: id, summary: `Restored ${current.title || 'untitled card'} from trash` })
  return { ok: true }
})
