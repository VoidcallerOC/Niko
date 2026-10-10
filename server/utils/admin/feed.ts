/**
 * Which Square catalog items the public homepage feed shows, and what about
 * them leaves the server. Pure, so it can be unit tested without Nitro.
 *
 * Shown: named, unarchived items sold at the connected location that are not
 * marked sold out and are either in stock or don't track stock. Newest first.
 * Never sent: Square ids, versions, variation ids, counts of hidden items.
 */
export interface CatalogItemLike {
  name: string
  description: string
  priceCents: number | null
  quantity: number | null
  updatedAt: string
  currency?: string
  imageUrl?: string | null
  archived?: boolean
  soldOut?: boolean
  atLocation?: boolean
}

export interface FeedCard {
  key: string
  name: string
  description: string
  priceCents: number | null
  currency: string
  quantity: number | null
  imageUrl: string | null
}

export const FEED_LIMIT = 60

const safeImage = (url: string | null | undefined) => {
  if (!url) return null
  try {
    return new URL(url).protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export function feedCards(items: CatalogItemLike[], limit = FEED_LIMIT): FeedCard[] {
  return items
    .filter((i) => i.name.trim() && !i.archived && i.atLocation !== false && !i.soldOut && (i.quantity === null || i.quantity > 0))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
    .slice(0, limit)
    .map((i, n) => ({
      key: `sq${n}`,
      name: i.name.trim(),
      description: i.description.trim().replace(/\s+/g, ' ').slice(0, 160),
      priceCents: typeof i.priceCents === 'number' && i.priceCents >= 0 ? i.priceCents : null,
      currency: /^[A-Z]{3}$/.test(i.currency ?? '') ? (i.currency as string) : 'USD',
      quantity: i.quantity,
      imageUrl: safeImage(i.imageUrl),
    }))
}
