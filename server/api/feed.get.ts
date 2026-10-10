import { publicFeed } from '../utils/admin/squareFeed'

/** Homepage feed: in-stock cards from Nino's Square catalog (empty when not connected). */
export default defineEventHandler(async (event) => {
  const feed = await publicFeed()
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  return feed
})
