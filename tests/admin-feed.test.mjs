import { test } from 'node:test'
import assert from 'node:assert/strict'

const { feedCards } = await import('../server/utils/admin/feed.ts')

const item = (over = {}) => ({ name: 'Card', description: '', priceCents: 1000, quantity: null, updatedAt: '2026-10-01T00:00:00Z', currency: 'USD', imageUrl: null, ...over })

test('feed shows in-stock and untracked items, newest first', () => {
  const cards = feedCards([
    item({ name: 'Old', updatedAt: '2026-09-01T00:00:00Z', quantity: 2 }),
    item({ name: 'New', updatedAt: '2026-10-05T00:00:00Z' }),
  ])
  assert.deepEqual(cards.map((c) => c.name), ['New', 'Old'])
  assert.equal(cards[1].quantity, 2)
})

test('feed hides sold-out, zero-stock, archived, unnamed and other-location items', () => {
  const cards = feedCards([
    item({ name: 'Zero', quantity: 0 }),
    item({ name: 'Sold out', soldOut: true }),
    item({ name: 'Archived', archived: true }),
    item({ name: '   ' }),
    item({ name: 'Elsewhere', atLocation: false }),
    item({ name: 'Shown', quantity: 1 }),
  ])
  assert.deepEqual(cards.map((c) => c.name), ['Shown'])
})

test('feed never invents a price and sends no Square ids', () => {
  const [c] = feedCards([{ ...item({ priceCents: null }), id: 'SQ-ITEM-1', variationId: 'SQ-VAR-1', version: 3 }])
  assert.equal(c.priceCents, null)
  assert.deepEqual(Object.keys(c).sort(), ['currency', 'description', 'imageUrl', 'key', 'name', 'priceCents', 'quantity'])
  assert.ok(!JSON.stringify(c).includes('SQ-'))
})

test('feed only passes https image URLs and trims long descriptions', () => {
  const [a, b] = feedCards([
    item({ name: 'A', imageUrl: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/x/original.jpeg', description: 'x'.repeat(400), updatedAt: '2026-10-02T00:00:00Z' }),
    item({ name: 'B', imageUrl: 'javascript:alert(1)' }),
  ])
  assert.ok(a.imageUrl.startsWith('https://'))
  assert.equal(a.description.length, 160)
  assert.equal(b.imageUrl, null)
})

test('feed is capped', () => {
  assert.equal(feedCards(Array.from({ length: 80 }, (_, i) => item({ name: `C${i}` }))).length, 60)
})
