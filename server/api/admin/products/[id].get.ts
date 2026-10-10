import { getProduct, listRevisions } from '../../../utils/admin/store'
import type { Product } from '../../../utils/admin/types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const product = await getProduct(id)
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Card not found' })
  const revisions = await listRevisions<Product>('product', id)
  return { product, revisions: revisions.map((r) => ({ id: r.id, at: r.at, title: r.before.title, priceCents: r.before.priceCents, quantity: r.before.quantity, availability: r.before.availability })) }
})
