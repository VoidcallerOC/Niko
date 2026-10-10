/**
 * JustTCG card search for the public scanner, ported from tcg-buy-calculator's
 * `api/cards.js` (VoidcallerOC/tcg-buy-calculator@e46d63f). Server-only: the key
 * (JUSTTCG_API_KEY on this Vercel project) never reaches the browser.
 *
 * One provider card becomes one entry per printing/language, priced per
 * condition in integer cents, with the provider's own timestamp. Nothing is
 * filled in: a missing, ambiguous or non-current price is left out.
 */

const API_BASE_URL = 'https://api.justtcg.com/v1'
const MAX_RESULTS = 20
const MAX_PROVIDER_REQUESTS = 4
const REQUEST_TIMEOUT_MS = 12_000

export const GAME_ALIASES: Record<string, string> = {
  'one-piece': 'one-piece-card-game',
  'flesh-and-blood': 'flesh-and-blood-tcg',
}
export const GAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/

const CONDITION_MAP = new Map([
  ['near mint', 'NM'],
  ['nm', 'NM'],
  ['lightly played', 'LP'],
  ['lp', 'LP'],
  ['moderately played', 'MP'],
  ['mp', 'MP'],
  ['heavily played', 'HP'],
  ['hp', 'HP'],
  ['damaged', 'DMG'],
  ['dmg', 'DMG'],
])

export interface PriceEntry {
  reference_cents: number
  source_updated_at: string | null
  source_variant_id: string | null
}

export interface CardEntry {
  id: string
  provider_card_id: string
  name: string
  card_number: string
  set_code: string
  set_name: string
  game: string | null
  image_url: string | null
  rarity: string | null
  printing: string | null
  language: string | null
  pricing: Record<string, PriceEntry>
}

export class SearchError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type Json = Record<string, unknown>

export function normalizeTimestamp(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  const date = Number.isFinite(numeric) ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric) : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const conditionCode = (value: unknown) => CONDITION_MAP.get(String(value ?? '').trim().toLocaleLowerCase()) ?? null

const slug = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Only a current, finite, non-negative provider price is a usable reference.
function variantPrice(variant: Json): number | null {
  if (variant.priceStatus && variant.priceStatus !== 'current') return null
  if (variant.reference_cents != null) {
    const cents = Number(variant.reference_cents)
    return Number.isSafeInteger(cents) && cents >= 0 ? cents : null
  }
  if (variant.price === null || variant.price === undefined) return null
  const price = Number(variant.price)
  return Number.isFinite(price) && price >= 0 ? Math.round(price * 100) : null
}

export function normalizeCard(card: unknown): CardEntry[] {
  if (!card || typeof card !== 'object') return []
  const c = card as Json
  const cardId = String(c.provider_card_id ?? c.id ?? c.uuid ?? c.tcgplayerId ?? '').trim()
  const name = String(c.name ?? '').trim()
  if (!cardId || !name) return []
  const variants = (Array.isArray(c.variants) ? c.variants : []) as Json[]
  const groups = new Map<string, { printing: string | null; language: string | null; pricing: Record<string, PriceEntry | { ambiguous: true }> }>()
  for (const variant of variants) {
    const code = conditionCode(variant.condition_code ?? variant.condition)
    if (!code) continue
    const printing = String(variant.printing ?? '').trim() || null
    const language = String(variant.language ?? '').trim() || null
    const key = `${printing ?? ''}|${language ?? ''}`
    if (!groups.has(key)) groups.set(key, { printing, language, pricing: {} })
    const cents = variantPrice(variant)
    if (cents === null) continue
    const pricing = groups.get(key)!.pricing
    const existing = pricing[code]
    // Two prices for one printing/language/condition is ambiguous: offer none.
    if (existing && (!('reference_cents' in existing) || existing.reference_cents !== cents)) pricing[code] = { ambiguous: true }
    else if (!existing)
      pricing[code] = {
        reference_cents: cents,
        source_updated_at: normalizeTimestamp(variant.source_updated_at ?? variant.lastUpdated),
        source_variant_id: (variant.provider_variant_id ?? variant.uuid ?? variant.id ?? null) as string | null,
      }
  }
  // Variants that carry no card condition (sealed product) are not cards.
  if (variants.length && !groups.size) return []
  if (!groups.size) groups.set('|', { printing: null, language: null, pricing: {} })
  const base = {
    provider_card_id: cardId,
    name,
    card_number: String(c.card_number ?? c.number ?? '').trim(),
    set_code: String(c.set_code ?? c.set ?? '').trim(),
    set_name: String(c.set_name ?? '').trim(),
    game: (c.game_id ?? c.game ?? null) as string | null,
    image_url: (c.image_url ?? null) as string | null,
    rarity: (c.rarity ?? null) as string | null,
  }
  return [...groups.values()].map((group) => {
    const pricing: Record<string, PriceEntry> = {}
    for (const [code, entry] of Object.entries(group.pricing)) if ('reference_cents' in entry) pricing[code] = entry
    return {
      ...base,
      id: groups.size > 1 || group.printing || group.language ? [cardId, slug(group.printing), slug(group.language)].filter(Boolean).join('::') : cardId,
      printing: group.printing,
      language: group.language,
      pricing,
    }
  })
}

// Printed collector numbers: OP05-060, ST18-005, LOB-EN001, 199/165, TG01/TG30.
export function collectorNumber(query: string): string | null {
  const slash = query.match(/\b([A-Z]{0,3}\d{1,4})\s?\/\s?([A-Z]{0,3}\d{1,4})\b/i)
  if (slash) return `${slash[1]}/${slash[2]}`.toUpperCase()
  const dash = query.match(/\b([A-Z]{1,6}\d{0,3})-([A-Z]{0,3}\d{1,4}[A-Z]?)\b/i)
  if (dash) return `${dash[1]}-${dash[2]}`.toUpperCase()
  const spaced = query.match(/\b([A-Z]{1,4}\d{1,3})\s?([A-Z]{0,2}\d{3})\b/i)
  if (spaced) return `${spaced[1]}-${spaced[2]}`.toUpperCase()
  return null
}

type Plan = { number: string } | { q: string } | { set: string; q: string | null }

export function searchPlans(query: string): Plan[] {
  const number = collectorNumber(query)
  const plans: Plan[] = []
  if (number) plans.push({ number })
  plans.push({ q: query })
  const words = query.split(' ')
  // "<card name> <set>" and set-only searches: resolve the set, then filter.
  plans.push({ set: query, q: null })
  for (let split = words.length - 1; split >= 1; split -= 1) plans.push({ set: words.slice(split).join(' '), q: words.slice(0, split).join(' ') })
  return plans
}

function providerError(status: number, body: Json): SearchError {
  if (status === 429) return new SearchError('The pricing provider is busy or its daily limit was reached. Try again later or ask Nino in person.', 503)
  if (status === 401 || status === 403) return new SearchError('Live pricing provider authorization failed.', 502)
  if (status >= 400 && status < 500 && body?.error) return new SearchError('Live pricing provider rejected the search.', 502)
  return new SearchError('Live pricing provider request failed.', 502)
}

export async function providerSearch(query: string, gameId: string, { apiKey, fetchImpl = fetch }: { apiKey: string; fetchImpl?: typeof fetch }): Promise<CardEntry[]> {
  if (!apiKey) throw new SearchError('Live pricing is not set up on this site yet.', 503)
  let requests = 0
  const call = async (path: string, params: Record<string, string>): Promise<Json[] | null> => {
    if (requests >= MAX_PROVIDER_REQUESTS) return null
    requests += 1
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetchImpl(`${API_BASE_URL}/${path}?${new URLSearchParams(params)}`, {
        headers: { Accept: 'application/json', 'x-api-key': apiKey },
        signal: controller.signal,
      })
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') throw new SearchError('Live pricing provider timed out.', 504)
      throw new SearchError('Live pricing provider is unreachable.', 502)
    } finally {
      clearTimeout(timer)
    }
    const body = (await response.json().catch(() => ({}))) as Json
    if (!response.ok) throw providerError(response.status, body)
    return Array.isArray(body.data) ? (body.data as Json[]) : []
  }
  const cards = async (filters: Record<string, string>) =>
    ((await call('cards', { game: gameId, ...filters, include_null_prices: 'true', limit: String(MAX_RESULTS), offset: '0' })) ?? []).flatMap(normalizeCard)

  const sets = new Map<string, string | null>()
  for (const plan of searchPlans(query)) {
    let found: CardEntry[]
    if ('set' in plan) {
      if (!sets.has(plan.set)) {
        const matches = await call('sets', { game: gameId, q: plan.set, limit: '1' })
        if (matches === null) break
        sets.set(plan.set, (matches[0]?.id as string) ?? null)
      }
      const setId = sets.get(plan.set)
      if (!setId) continue
      found = await cards({ set: setId, ...(plan.q ? { q: plan.q } : {}) })
    } else found = await cards(plan as Record<string, string>)
    if (found.length) return found
    if (requests >= MAX_PROVIDER_REQUESTS) break
  }
  return []
}
