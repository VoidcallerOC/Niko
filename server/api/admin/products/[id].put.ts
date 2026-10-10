import { getProduct, logActivity, nowIso, putProduct, saveRevision } from '../../../utils/admin/store'
import { applyProductInput } from '../../../utils/admin/validate'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const current = await getProduct(id)
  if (!current || current.deletedAt) throw createError({ statusCode: 404, statusMessage: 'Card not found' })
  const body = await readBody(event)
  const now = nowIso()
  const next = applyProductInput(current, body, now)
  await saveRevision('product', id, current)
  await putProduct(next)
  const changed = (['title', 'priceCents', 'quantity', 'availability'] as const).filter((k) => current[k] !== next[k])
  await logActivity({
    kind: 'update',
    entity: 'product',
    entityId: id,
    summary: `${next.title || 'Untitled card'}: ${changed.length ? changed.join(', ') : 'details'} updated`,
  })
  return { product: next }
})
