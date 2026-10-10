/** A card as /api/cards returns it: one printing/language, priced per condition in cents. */
export interface ScanCard {
  id: string
  name: string
  card_number: string
  set_code?: string
  set_name: string
  game: string | null
  rarity: string | null
  printing: string | null
  language: string | null
  pricing: Record<string, { reference_cents: number; source_updated_at: string | null } | undefined>
}

/** Shared by manual search and the scanner: this site's own /api/cards (JustTCG). */
export async function searchCards(query: string, game: string): Promise<ScanCard[]> {
  const response = await fetch(`/api/cards?game=${encodeURIComponent(game)}&q=${encodeURIComponent(query)}`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Live pricing is unavailable right now.')
  return Array.isArray(body.cards) ? body.cards : []
}

export const SCAN_GAMES = [
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'one-piece-card-game', label: 'One Piece' },
  { value: 'magic-the-gathering', label: 'Magic: The Gathering' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'disney-lorcana', label: 'Disney Lorcana' },
  { value: 'flesh-and-blood-tcg', label: 'Flesh and Blood' },
] as const

export const SCAN_CONDITIONS = [
  { name: 'Near Mint', code: 'NM' },
  { name: 'Lightly Played', code: 'LP' },
  { name: 'Moderately Played', code: 'MP' },
  { name: 'Heavily Played', code: 'HP' },
  { name: 'Damaged', code: 'DMG' },
] as const

/** "usable" | "missing" | "undated" | "stale". A price without a date is never usable. */
export function pricingState(pricing: ScanCard['pricing'][string], staleDays: number, now = Date.now()) {
  if (!pricing || !Number.isSafeInteger(pricing.reference_cents)) return 'missing' as const
  const updatedAt = new Date(pricing.source_updated_at ?? NaN).getTime()
  if (!Number.isFinite(updatedAt)) return 'undated' as const
  return now - updatedAt <= staleDays * 86_400_000 ? ('usable' as const) : ('stale' as const)
}

/** Printing/language distinguish copies that share a name and number. */
export function cardLabel(card: ScanCard) {
  const variant = [card.printing, card.language === 'English' ? null : card.language].filter(Boolean).join(' · ')
  return [card.name, card.card_number, variant].filter(Boolean).join(' · ')
}
