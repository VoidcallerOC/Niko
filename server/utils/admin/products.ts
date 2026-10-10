import type { Product, Settings } from './types'
import { listProducts } from './store'

export type ProductFilter = 'all' | 'listed' | 'draft' | 'hidden' | 'sold' | 'low' | 'trash'

export const isLowStock = (p: Product, settings: Settings) =>
  p.availability === 'listed' && p.quantity <= settings.lowStockThreshold

export function matches(p: Product, q: string) {
  if (!q) return true
  const hay = [p.title, p.game, p.set, p.cardNumber, p.rarity, p.condition, p.grade.company, p.grade.grade, p.grade.certNumber, p.notes]
    .join(' ')
    .toLowerCase()
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((term) => hay.includes(term))
}

export async function queryProducts(filter: ProductFilter, q: string, settings: Settings) {
  const all = await listProducts()
  const live = all.filter((p) => !p.deletedAt)
  const pool = filter === 'trash' ? all.filter((p) => p.deletedAt) : live
  const picked = pool.filter((p) => {
    if (filter === 'all' || filter === 'trash') return true
    if (filter === 'low') return isLowStock(p, settings)
    return p.availability === filter
  })
  // Stable order (newest first) so a quantity tap never moves the row under your thumb.
  return picked.filter((p) => matches(p, q)).sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? 1 : -1))
}

/** What the public site may see: listed cards only, no notes, no Square ids. */
export function publicProduct(p: Product) {
  return {
    id: p.id,
    title: p.title,
    game: p.game,
    set: p.set,
    cardNumber: p.cardNumber,
    rarity: p.rarity,
    condition: p.condition,
    grade: p.grade.company && p.grade.grade ? `${p.grade.company} ${p.grade.grade}` : '',
    priceCents: p.priceCents,
    quantity: p.quantity,
    photo: p.photos[0] ?? null,
  }
}
