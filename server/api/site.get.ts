import { getSettings, listEvents, listProducts } from '../utils/admin/store'
import { publicProduct } from '../utils/admin/products'
import { INSTAGRAM_IMPORT } from '../utils/admin/instagram'

/**
 * What the public homepage reads from the admin store. Only listed cards and
 * published events leave the server; never notes, drafts or Square ids.
 */
export default defineEventHandler(async (event) => {
  const [settings, products, events] = await Promise.all([getSettings(), listProducts(), listEvents()])
  const listed = products.filter((p) => !p.deletedAt && p.availability === 'listed')
  const byId = new Map(listed.map((p) => [p.id, p]))
  const featured = settings.featuredProductIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p)
  const today = new Date().toISOString().slice(0, 10)
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  return {
    copy: settings.copy,
    featured: featured.map(publicProduct),
    instagram: { hidden: settings.instagram.hidden, featured: settings.instagram.featured, importedAt: INSTAGRAM_IMPORT.importedAt },
    events: events
      .filter((e) => !e.deletedAt && e.published && e.endDate >= today)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map(({ id, title, date, endDate, hours, venue, city, state, url }) => ({ id, title, date, endDate, hours, venue, city, state, url })),
  }
})
