import { logActivity, newId, nowIso, putProduct } from '../../../utils/admin/store'
import { applyProductInput } from '../../../utils/admin/validate'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const now = nowIso()
  const product = applyProductInput(null, body, now)
  product.id = newId()
  product.createdAt = now
  if (body && typeof body === 'object' && (body as { source?: unknown }).source === 'scan') product.source = 'scan'
  await putProduct(product)
  await logActivity({ kind: 'create', entity: 'product', entityId: product.id, summary: `Added ${product.title || 'untitled card'} (${product.availability})` })
  return { product }
})
