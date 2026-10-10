import { GAME_ALIASES, GAME_PATTERN, SearchError, providerSearch } from '../utils/justtcg'

// Shared CDN cache for identical searches: keeps the provider quota for new
// lookups while prices stay well inside the 7-day freshness threshold.
const SUCCESS_CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=300'

/**
 * Card search for the public scanner on this site. Same-site only: JustTCG's
 * terms forbid re-exposing their data, so this is not a lookup for other sites.
 */
export default defineEventHandler(async (event) => {
  if (getRequestHeader(event, 'sec-fetch-site') === 'cross-site') {
    setResponseStatus(event, 403)
    setHeader(event, 'Cache-Control', 'no-store')
    return { error: 'Cross-site card search is not allowed.' }
  }
  const params = getQuery(event)
  const query = String(params.q ?? '').trim().replace(/\s+/g, ' ')
  const requested = String(params.game ?? 'pokemon').trim().toLowerCase()
  const game = GAME_ALIASES[requested] ?? requested
  const fail = (status: number, error: string) => {
    setResponseStatus(event, status)
    setHeader(event, 'Cache-Control', 'no-store')
    return { error }
  }
  if (query.length < 2 || query.length > 120) return fail(400, 'Search must be between 2 and 120 characters.')
  if (!GAME_PATTERN.test(game)) return fail(400, 'Unknown card game.')
  try {
    const apiKey = String(useRuntimeConfig(event).justtcgApiKey || process.env.JUSTTCG_API_KEY || '')
    const cards = (await providerSearch(query, game, { apiKey })).map((card) => ({ ...card, game }))
    setHeader(event, 'Cache-Control', SUCCESS_CACHE)
    return { game, source: 'provider', pricing_source: 'JustTCG', cards }
  } catch (error) {
    if (!(error instanceof SearchError)) console.error('[cards] search failed:', error instanceof Error ? error.message : error)
    return fail(error instanceof SearchError ? error.status : 502, error instanceof SearchError ? error.message : 'Card search failed.')
  }
})
