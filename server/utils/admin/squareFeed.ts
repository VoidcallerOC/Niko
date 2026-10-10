import { currentConnection } from './squareAuth'
import { fetchCatalogItems } from './square'
import { feedCards, type FeedCard } from './feed'

/**
 * The homepage feed, read live from Nino's Square catalog through the OAuth
 * connection he made in the admin. Tokens stay on the server; the browser only
 * gets the cards below. One Square read is shared by every visitor for a few
 * minutes (kept in the admin store). If Square errors, the last good read is
 * shown for up to a day; with no connection the site falls back to Instagram.
 */
export interface PublicFeed {
  source: 'square' | 'demo' | null
  fetchedAt: string | null
  cards: FeedCard[]
}

interface Cached extends PublicFeed {
  owner: string
}

const KEY = 'public:feed'
const FRESH_MS = 5 * 60 * 1000
const STALE_MS = 24 * 60 * 60 * 1000
const TIMEOUT_MS = 8000
const NONE: PublicFeed = { source: null, fetchedAt: null, cards: [] }

const strip = ({ source, fetchedAt, cards }: PublicFeed): PublicFeed => ({ source, fetchedAt, cards })

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms)
    p.then((v) => (clearTimeout(t), resolve(v)), (e) => (clearTimeout(t), reject(e)))
  })
}

export async function publicFeed(): Promise<PublicFeed> {
  const conn = await currentConnection().catch(() => null)
  if (!conn) return NONE
  // A cached read only counts for the store it came from.
  const owner = `${conn.source}:${conn.env ?? ''}:${conn.merchantId}`
  const storage = useStorage('admin')
  const cached = await storage.getItem<Cached>(KEY).catch(() => null)
  const age = cached?.owner === owner && cached.fetchedAt ? Date.now() - Date.parse(cached.fetchedAt) : Infinity
  if (cached && age < FRESH_MS) return strip(cached)
  try {
    const { items, source } = await withTimeout(fetchCatalogItems(), TIMEOUT_MS)
    const fresh: Cached = { source, fetchedAt: new Date().toISOString(), cards: feedCards(items), owner }
    await storage.setItem(KEY, fresh).catch(() => {})
    return strip(fresh)
  } catch (error) {
    console.error('[feed] Square catalog read failed:', error instanceof Error ? error.message : error)
    return cached && age < STALE_MS ? strip(cached) : NONE
  }
}
