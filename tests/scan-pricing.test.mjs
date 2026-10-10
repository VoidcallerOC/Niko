import { test } from 'node:test'
import assert from 'node:assert/strict'

// Public /scan: JustTCG normalisation and search (server), the offer maths and
// the list (browser modules forked from the TCG Buy Calculator).
const { normalizeCard, providerSearch, collectorNumber, SearchError } = await import('../server/utils/justtcg.ts')
const { calculateOffer, parsePercentageToBasisPoints } = await import('../app/lib/pricing/money.js')
const { addEntry, summarize } = await import('../app/lib/pricing/offer-list.js')
const { pricingState } = await import('../app/composables/useCardSearch.ts')
const { extractClues, correctClues } = await import('../app/lib/scanner/card-identifier.js')
const { matchCatalog, MATCH_STATUS } = await import('../app/lib/scanner/catalog-matcher.js')

const provider = {
  id: 'pokemon-151-charizard-ex',
  name: 'Charizard ex',
  number: '199/165',
  set: 'sv-151',
  set_name: 'Scarlet & Violet 151',
  rarity: 'Special Illustration Rare',
  variants: [
    { id: 'v1', condition: 'Near Mint', printing: 'Holofoil', language: 'English', price: 200, lastUpdated: 1791600000 },
    { id: 'v2', condition: 'Lightly Played', printing: 'Holofoil', language: 'English', price: 180.555, lastUpdated: 1791600000 },
    { id: 'v3', condition: 'Near Mint', printing: 'Reverse Holofoil', language: 'English', price: 150, lastUpdated: 1791600000 },
    { id: 'v4', condition: 'Damaged', printing: 'Holofoil', language: 'English', price: null },
    { id: 'v5', condition: 'Sealed', printing: 'Holofoil', language: 'English', price: 999 },
  ],
}

test('one provider card becomes one entry per printing, priced per condition in cents', () => {
  const cards = normalizeCard(provider)
  assert.deepEqual(cards.map((c) => c.id), ['pokemon-151-charizard-ex::holofoil::english', 'pokemon-151-charizard-ex::reverse-holofoil::english'])
  const holo = cards[0]
  assert.equal(holo.card_number, '199/165')
  assert.equal(holo.pricing.NM.reference_cents, 20000)
  assert.equal(holo.pricing.LP.reference_cents, 18056)
  assert.equal(holo.pricing.NM.source_updated_at, new Date(1791600000 * 1000).toISOString())
  assert.equal(holo.pricing.DMG, undefined, 'a null price is left out, not zero')
  assert.equal(cards[1].pricing.NM.reference_cents, 15000)
})

test('ambiguous or non-current prices are dropped; sealed product is not a card', () => {
  const [card] = normalizeCard({
    id: 'x',
    name: 'X',
    variants: [
      { condition: 'Near Mint', price: 10 },
      { condition: 'Near Mint', price: 12 },
      { condition: 'Lightly Played', price: 5, priceStatus: 'stale' },
    ],
  })
  assert.deepEqual(card.pricing, {})
  assert.deepEqual(normalizeCard({ id: 'box', name: 'Booster Box', variants: [{ condition: 'Sealed', price: 100 }] }), [])
  assert.deepEqual(normalizeCard({ name: 'no id' }), [])
})

test('collector numbers are recognised for search', () => {
  assert.equal(collectorNumber('Charizard 199/165'), '199/165')
  assert.equal(collectorNumber('op05-119'), 'OP05-119')
  assert.equal(collectorNumber('Charizard'), null)
})

test('search sends the key server-side only and searches by number first', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), key: init.headers['x-api-key'] })
    return new Response(JSON.stringify({ data: [provider] }), { status: 200 })
  }
  const cards = await providerSearch('199/165', 'pokemon', { apiKey: 'k-test', fetchImpl })
  assert.equal(cards.length, 2)
  assert.equal(calls.length, 1)
  assert.match(calls[0].url, /\/cards\?game=pokemon&number=199%2F165/)
  assert.equal(calls[0].key, 'k-test')
})

test('no key → honest "not set up" error, no request made', async () => {
  let called = false
  await assert.rejects(
    providerSearch('Charizard', 'pokemon', { apiKey: '', fetchImpl: async () => ((called = true), new Response('{}')) }),
    (error) => error instanceof SearchError && error.status === 503 && /not set up/.test(error.message),
  )
  assert.equal(called, false)
})

test('provider limits and auth failures become clear errors, never empty results', async () => {
  const respond = (status) => async () => new Response(JSON.stringify({ error: 'x' }), { status })
  await assert.rejects(providerSearch('Charizard', 'pokemon', { apiKey: 'k', fetchImpl: respond(429) }), (e) => e.status === 503 && /busy|limit/.test(e.message))
  await assert.rejects(providerSearch('Charizard', 'pokemon', { apiKey: 'k', fetchImpl: respond(401) }), (e) => e.status === 502 && /authorization/.test(e.message))
})

test('a search never makes more than 4 provider requests', async () => {
  let calls = 0
  const fetchImpl = async () => ((calls += 1), new Response(JSON.stringify({ data: [] }), { status: 200 }))
  assert.deepEqual(await providerSearch('some long card name here', 'pokemon', { apiKey: 'k', fetchImpl }), [])
  assert.ok(calls <= 4, `made ${calls} requests`)
})

test('offer is 60% of the market reference in whole cents; list totals only priced cards', () => {
  const rate = parsePercentageToBasisPoints('60%')
  assert.equal(calculateOffer(1499, rate).offerCents, 899)
  assert.equal(calculateOffer(20000, rate).offerCents, 12000)
  let list = addEntry([], { key: 'a', label: 'A', condition: 'Near Mint', offerCents: 899, referenceCents: 1499 })
  list = addEntry(list, { key: 'b', label: 'B', condition: 'Near Mint', unavailable: 'price out of date' })
  assert.deepEqual(summarize(list), { count: 2, priced: 1, unpriced: 1, offerCents: 899, referenceCents: 1499 })
})

test('freshness: undated and older-than-7-day prices are never usable', () => {
  const now = Date.parse('2026-10-10T12:00:00Z')
  assert.equal(pricingState({ reference_cents: 100, source_updated_at: '2026-10-09T12:00:00Z' }, 7, now), 'usable')
  assert.equal(pricingState({ reference_cents: 100, source_updated_at: '2026-10-01T12:00:00Z' }, 7, now), 'stale')
  assert.equal(pricingState({ reference_cents: 100, source_updated_at: null }, 7, now), 'undated')
  assert.equal(pricingState(undefined, 7, now), 'missing')
})

test('scan → match against normalised provider cards: two printings need confirmation', async () => {
  const cards = normalizeCard(provider).map((c) => ({ ...c, game: 'pokemon' }))
  const clues = extractClues([{ region: 'full', text: 'Charizard ex\n199/165', confidence: 80 }])
  const match = await matchCatalog(clues, { selectedGame: 'pokemon', search: async () => cards })
  assert.equal(match.status, MATCH_STATUS.NEEDS_CONFIRMATION)
  assert.equal(match.candidates.length, 2)
  const fixed = correctClues(clues, { name: 'Charizard ex', number: '199/165' }, 'pokemon')
  assert.equal(fixed.corrected, true)
})
