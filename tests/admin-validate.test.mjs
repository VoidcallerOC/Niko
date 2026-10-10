import { test } from 'node:test'
import assert from 'node:assert/strict'

// The validators throw through Nitro's auto-imported createError; stand it in.
globalThis.createError = (opts) => Object.assign(new Error(opts.statusMessage), opts)
const { applyProductInput, applyEventInput, applySettingsInput, parsePriceCents } = await import('../server/utils/admin/validate.ts')
const { DEFAULT_SETTINGS } = await import('../server/utils/admin/types.ts')

const now = '2026-10-10T12:00:00.000Z'

test('price: dollars in, whole cents out, empty means undecided', () => {
  assert.equal(parsePriceCents('12.50'), 1250)
  assert.equal(parsePriceCents('$1,000'), 100000)
  assert.equal(parsePriceCents(''), null)
  assert.equal(parsePriceCents(null), null)
  assert.throws(() => parsePriceCents('ten'), /Price must be/)
  assert.throws(() => parsePriceCents('-5'), /Price must be/)
})

test('a new card needs nothing but defaults to an unpriced draft', () => {
  const p = applyProductInput(null, { title: 'Charizard ex' }, now)
  assert.equal(p.availability, 'draft')
  assert.equal(p.priceCents, null)
  assert.equal(p.condition, '')
  assert.deepEqual(p.grade, { company: '', grade: '', certNumber: '' })
  assert.equal(p.quantity, 1)
})

test('listing requires a title and a typed price', () => {
  assert.throws(() => applyProductInput(null, { title: 'X', availability: 'listed' }, now), /price/)
  assert.throws(() => applyProductInput(null, { availability: 'listed', priceCents: '5' }, now), /title/)
  const ok = applyProductInput(null, { title: 'X', availability: 'listed', priceCents: '5' }, now)
  assert.equal(ok.availability, 'listed')
  assert.equal(ok.priceCents, 500)
})

test('partial updates keep untouched fields and reject bad values', () => {
  const base = applyProductInput(null, { title: 'Luffy', game: 'One Piece', priceCents: '12', quantity: 3 }, now)
  const next = applyProductInput(base, { quantity: 2 }, now)
  assert.equal(next.title, 'Luffy')
  assert.equal(next.game, 'One Piece')
  assert.equal(next.priceCents, 1200)
  assert.equal(next.quantity, 2)
  assert.throws(() => applyProductInput(base, { quantity: -1 }, now), /Quantity/)
  assert.throws(() => applyProductInput(base, { availability: 'gone' }, now), /Availability/)
  assert.throws(() => applyProductInput(base, { photos: [{ src: 'javascript:alert(1)' }] }, now), /Photo source/)
})

test('events need a name and a real date; end date defaults to the start', () => {
  assert.throws(() => applyEventInput(null, { title: 'Show', date: 'soon' }, now), /date/)
  assert.throws(() => applyEventInput(null, { date: '2026-11-07' }, now), /name/)
  assert.throws(() => applyEventInput(null, { title: 'Show', date: '2026-11-07', endDate: '2026-11-06' }, now), /end date/)
  const e = applyEventInput(null, { title: 'Show', date: '2026-11-07', url: 'https://www.ontreasure.com/e/x' }, now)
  assert.equal(e.endDate, '2026-11-07')
  assert.equal(e.published, false)
})

test('settings keep defaults for empty fields and validate links', () => {
  const s = applySettingsInput(DEFAULT_SETTINGS, { copy: { heroHeadline: 'Nothing but heat.' }, featuredProductIds: ['a', 'b'] }, now)
  assert.equal(s.copy.heroHeadline, 'Nothing but heat.')
  assert.equal(s.copy.heroIntro, '')
  assert.deepEqual(s.featuredProductIds, ['a', 'b'])
  assert.equal(s.lowStockThreshold, 1)
  assert.throws(() => applySettingsInput(DEFAULT_SETTINGS, { copy: { instagramUrl: 'http://insecure' } }, now), /https/)
})
