import { readFile } from 'node:fs/promises'
import type { TreasureResult } from '../utils/treasureShows'

/**
 * Upcoming OnTreasure shows for the homepage (server-rendered via useAsyncData).
 *
 * For local work without network access, set NUXT_TREASURE_SHOWS_FIXTURE to a
 * JSON file holding a TreasureResult. It is not set on Vercel.
 */
export default defineEventHandler(async (event): Promise<TreasureResult> => {
  const fixture = process.env.NUXT_TREASURE_SHOWS_FIXTURE
  if (fixture) {
    return JSON.parse(await readFile(fixture, 'utf8')) as TreasureResult
  }
  const result = await loadTreasureShows()
  // Let Vercel's CDN share one OnTreasure fetch across visitors for 5 minutes.
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  return result
})
