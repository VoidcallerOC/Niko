import { getProduct, listRevisions, logActivity, nowIso, putProduct, saveRevision } from '../../../../utils/admin/store'
import type { Product } from '../../../../utils/admin/types'

/** Put back an earlier saved version. The current version is kept as a revision too. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ revisionId?: unknown }>(event)
  const revisionId = typeof body?.revisionId === 'string' ? body.revisionId : ''
  const current = await getProduct(id)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Card not found' })
  const rev = (await listRevisions<Product>('product', id)).find((r) => r.id === revisionId)
  if (!rev) throw createError({ statusCode: 404, statusMessage: 'Version not found' })
  await saveRevision('product', id, current)
  const restored: Product = { ...rev.before, id, deletedAt: current.deletedAt, updatedAt: nowIso() }
  await putProduct(restored)
  await logActivity({ kind: 'update', entity: 'product', entityId: id, summary: `Reverted ${restored.title || 'untitled card'} to the version from ${rev.at}` })
  return { product: restored }
})
