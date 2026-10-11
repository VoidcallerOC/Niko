// node --experimental-strip-types --test tests/treasure-shows.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { extractUser, readEvents, easternToday, actionIdFrom, eventsRequestBody } from '../server/utils/treasureShows.ts'

const fixture = new URL('./fixtures/ontreasure-profile.html', import.meta.url)

test('extractUser reads the vendor object out of the real profile flight payload', async () => {
  const html = await readFile(fixture, 'utf8')
  const user = extractUser(html)
  assert.equal(user.username, 'ninoscollectibles')
  assert.match(user.id, /^[0-9a-f-]{36}$/)
})

test('extractUser rejects a page for a different vendor', () => {
  assert.throws(() => extractUser('{\\"id\\":\\"x\\",\\"username\\":\\"someone_else\\"}'), /did not include/)
})

// Shape of the objects OnTreasure's getUserEventsDisplayData action returns
// (field names taken from Thousand Sunny's production parser).
const ev = (o) =>
  JSON.stringify({
    id: o.id,
    name: o.name,
    cleaned_name: o.slug,
    city: o.city,
    state: o.state,
    venue_name: o.venue,
    min_date: o.min,
    max_date: o.max ?? o.min,
    publicPosterUrl: o.poster ?? 'https://example.test/poster.webp',
    formattedDates: (o.days ?? [o.min]).map((date) => ({ date: o.labels?.[date] ?? date })),
  })

const payload = (...events) => `0:["$","div",null,{"children":[${events.join(',')}]}]\n`

test('readEvents keeps upcoming events, drops past ones, sorts by date', () => {
  const body = payload(
    ev({ id: 'b', name: 'Friday Night at the Den', slug: 'den-10162026', city: 'Pembroke', state: 'MA', min: '2026-10-16', labels: { '2026-10-16': 'Fri, Oct 16' } }),
    ev({ id: 'a', name: 'ColleX II', slug: 'collex-ii-10102026', city: 'Wallingford', state: 'CT', venue: 'Oakdale Theatre', min: '2026-10-10', labels: { '2026-10-10': 'Sat, Oct 10' } }),
    ev({ id: 'z', name: 'Old show', slug: 'old-10032026', city: 'Peabody', state: 'MA', min: '2026-10-03' }),
  )
  const shows = readEvents(body, '2026-10-10')
  assert.deepEqual(shows.map((s) => s.slug), ['collex-ii-10102026', 'den-10162026'])
  const [collex, den] = shows
  assert.equal(collex.url, 'https://www.ontreasure.com/events/collex-ii-10102026')
  assert.equal(collex.dateLabel, 'Sat, Oct 10')
  assert.equal(collex.location, 'Oakdale Theatre · Wallingford, CT')
  assert.equal(collex.startDate, '2026-10-10')
  assert.equal(collex.endDate, '2026-10-10')
  assert.equal(den.location, 'Pembroke, MA')
  assert.equal(den.posterAlt, 'Friday Night at the Den event poster')
})

test('readEvents labels multi-day events and de-duplicates by id', () => {
  const multi = ev({ id: 'm', name: 'Weekend Expo', slug: 'expo', city: 'Hartford', state: 'CT', min: '2026-11-07', max: '2026-11-08', days: ['2026-11-07', '2026-11-08'], labels: { '2026-11-07': 'Sat, Nov 7', '2026-11-08': 'Sun, Nov 8' } })
  const shows = readEvents(payload(multi, multi), '2026-10-10')
  assert.equal(shows.length, 1)
  assert.equal(shows[0].dateLabel, 'Sat, Nov 7 – Sun, Nov 8')
})

test('readEvents ignores objects without cleaned_name and survives stray braces', () => {
  const body = `0:[{"foo":"{not an event}"},${ev({ id: 'q', name: 'Show', slug: 'show-1', city: 'X', state: 'Y', min: '2099-01-01' })}]`
  assert.equal(readEvents(body, '2026-10-10').length, 1)
})

test('easternToday is an ISO date', () => {
  assert.match(easternToday(new Date('2026-10-10T03:30:00Z')), /^\d{4}-\d{2}-\d{2}$/)
  // 03:30 UTC on Oct 10 is still Oct 9 in New York
  assert.equal(easternToday(new Date('2026-10-10T03:30:00Z')), '2026-10-09')
})

// Snippet of OnTreasure's own chunk (2026-10-11): the id is 42 hex characters.
const chunk =
  'e.i(95187);let o=(0,s.createServerReference)("407e5caea3ee6a16d8f7daafe00262f2f560783759",s.callServer,void 0,s.findSourceMapURL,"getUserEventsDisplayData"),u=["Attending","Hosting","Vending","Liked"];'

test('actionIdFrom reads the whole action id, not a 40-character prefix', () => {
  assert.equal(actionIdFrom(chunk), '407e5caea3ee6a16d8f7daafe00262f2f560783759')
  assert.equal(actionIdFrom('no action here'), null)
})

test('eventsRequestBody sends the object OnTreasure\'s profile page sends for the Vending tab', () => {
  assert.deepEqual(JSON.parse(eventsRequestBody('user-1', 2)), [
    { page: 2, filter: 'Vending', upcoming: true, userId: 'user-1', from: '$undefined', until: '$undefined' },
  ])
})
