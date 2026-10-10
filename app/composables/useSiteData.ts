/**
 * Owner-editable content for the public homepage (/api/site). Every section
 * keeps its built-in copy when a field is empty, so an empty admin store
 * renders the site exactly as before.
 */
export interface SiteData {
  copy: Record<string, string>
  featured: Array<{ id: string; title: string; game: string; set: string; cardNumber: string; rarity: string; condition: string; grade: string; priceCents: number | null; quantity: number; photo: { src: string; alt: string } | null }>
  instagram: { hidden: string[]; featured: string[]; importedAt: string }
  events: Array<{ id: string; title: string; date: string; endDate: string; hours: string; venue: string; city: string; state: string; url: string }>
}

const empty = (): SiteData => ({ copy: {}, featured: [], instagram: { hidden: [], featured: [], importedAt: '' }, events: [] })

export function useSiteData() {
  return useAsyncData<SiteData>('site', () => $fetch<SiteData>('/api/site' as string).catch(() => empty()), { default: empty })
}

/** Links with admin overrides, readable from any component without a fetch. */
export function useSiteLinks() {
  const { data } = useNuxtData<SiteData>('site')
  return computed(() => ({
    instagramUrl: data.value?.copy.instagramUrl || 'https://www.instagram.com/ninoscollectibles/',
    onTreasureUrl: data.value?.copy.onTreasureUrl || 'https://www.ontreasure.com/u/ninoscollectibles',
  }))
}

/** In-stock cards from Nino's Square catalog (/api/feed); empty until Square is connected. */
export interface SquareFeed {
  source: 'square' | 'demo' | null
  fetchedAt: string | null
  cards: Array<{ key: string; name: string; description: string; priceCents: number | null; currency: string; quantity: number | null; imageUrl: string | null }>
}

export function useSquareFeed() {
  const none = (): SquareFeed => ({ source: null, fetchedAt: null, cards: [] })
  return useAsyncData<SquareFeed>('square-feed', () => $fetch<SquareFeed>('/api/feed' as string).catch(() => none()), { default: none })
}
