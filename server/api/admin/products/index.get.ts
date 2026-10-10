import { getSettings } from '../../../utils/admin/store'
import { queryProducts, type ProductFilter } from '../../../utils/admin/products'
import { ensureDemoSeed } from '../../../utils/admin/demo'

const FILTERS = new Set<ProductFilter>(['all', 'listed', 'draft', 'hidden', 'sold', 'low', 'trash'])

export default defineEventHandler(async (event) => {
  await ensureDemoSeed()
  const query = getQuery(event)
  const filter = (typeof query.filter === 'string' && FILTERS.has(query.filter as ProductFilter) ? query.filter : 'all') as ProductFilter
  const q = typeof query.q === 'string' ? query.q.slice(0, 100) : ''
  const settings = await getSettings()
  const products = await queryProducts(filter, q, settings)
  return { products, filter, q, lowStockThreshold: settings.lowStockThreshold }
})
