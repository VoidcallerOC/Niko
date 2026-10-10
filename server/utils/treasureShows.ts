/**
 * Upcoming vending events from Nino's OnTreasure profile.
 *
 * Adapted from Thousand Sunny's `src/lib/treasure-shows.ts` (same approach,
 * ported from a TanStack server function to a plain Nitro utility):
 *
 *   1. GET the public profile page and read the vendor's user object out of
 *      the Next.js flight payload.
 *   2. POST OnTreasure's own "getUserEventsDisplayData" server action for the
 *      Vending tab, which returns the event objects the profile page renders.
 *   3. If the stored action id has rotated, find the current one in
 *      OnTreasure's JS chunks and retry once.
 *   4. Parse, drop anything whose last day is before today (America/New_York),
 *      de-duplicate, sort by date.
 *
 * OnTreasure stays the source of truth: nothing here is hand-written. If any
 * step fails the caller gets `[]` (or the last good result) and the page falls
 * back to the profile link.
 */

export const TREASURE_PROFILE = 'https://www.ontreasure.com/u/ninoscollectibles'
const VENDOR = 'ninoscollectibles'
const ORIGIN = 'https://www.ontreasure.com'

export interface TreasureShow {
  slug: string
  url: string
  title: string
  /** e.g. "Sat, Oct 10" or "Sat, Oct 10 – Sun, Oct 11" */
  dateLabel: string
  /** ISO date (YYYY-MM-DD) of the first day */
  startDate: string
  /** ISO date (YYYY-MM-DD) of the last day */
  endDate: string
  venue: string
  city: string
  state: string
  location: string
  poster: string
  posterAlt: string
}

export interface TreasureResult {
  status: 'ok' | 'unavailable'
  shows: TreasureShow[]
  fetchedAt: string
}

// Current id of OnTreasure's getUserEventsDisplayData action (from Thousand
// Sunny, Oct 2026). `findAction` replaces it at runtime if it has rotated.
let actionId = '7ee3f21cc8faf356c52c7141510f47fd62e88b4336'

const FRESH_MS = 5 * 60 * 1000
let cache: { at: number; result: TreasureResult } | null = null

export function easternToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Returns the balanced `{...}` starting at `start`, honouring JSON strings. */
function scanObject(source: string, start: number): string | null {
  let depth = 0
  let quote = false
  let escape = false
  for (let i = start; i < source.length; i++) {
    const ch = source[i]
    if (quote) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') quote = false
      continue
    }
    if (ch === '"') quote = true
    else if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  return null
}

export function extractUser(html: string): Record<string, string> {
  const marker = String.raw`\"username\":\"${VENDOR}\"`
  const at = html.indexOf(marker)
  if (at < 0) throw new Error('OnTreasure profile did not include the vendor')
  const start = html.lastIndexOf(String.raw`{\"id\":`, at)
  if (start < 0) throw new Error('Could not read the OnTreasure profile')
  const unescaped = html
    .slice(start, at + 1200)
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, '&')
    .replace(/\\n/g, '\n')
  const raw = scanObject(unescaped, 0)
  if (!raw) throw new Error('Could not read the OnTreasure profile')
  const obj = JSON.parse(raw) as Record<string, string>
  if (!obj.id || obj.username !== VENDOR) throw new Error('OnTreasure profile was unexpected')
  return obj
}

async function findAction(html: string): Promise<string> {
  const srcs = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"'\\\s>]+\.js/g)].map((m) => m[0]))]
  for (let i = 0; i < srcs.length; i += 6) {
    const batch = srcs.slice(i, i + 6)
    const texts = await Promise.all(
      batch.map(async (src) => {
        const res = await fetch(`${ORIGIN}${src}`)
        return res.ok ? res.text() : ''
      }),
    )
    for (const text of texts) {
      const at = text.indexOf('getUserEventsDisplayData')
      if (at < 0) continue
      const ids = text.slice(Math.max(0, at - 500), at).match(/[a-f0-9]{40}/g)
      if (ids?.length) return ids[ids.length - 1]!
    }
  }
  throw new Error('OnTreasure show feed is not available')
}

interface RawEvent {
  id?: string
  name?: string
  cleaned_name?: string
  city?: string
  state?: string
  venue_name?: string
  min_date?: string
  max_date?: string
  publicPosterUrl?: string
  formattedDates?: { date?: string }[]
}

function enclosingEvent(source: string, indexInside: number) {
  let cursor = indexInside
  while (cursor >= 0) {
    const start = source.lastIndexOf('{', cursor)
    if (start < 0) return null
    const raw = scanObject(source, start)
    if (raw && start + raw.length > indexInside) {
      try {
        const event = JSON.parse(raw) as RawEvent
        if (event.cleaned_name) return { start, raw, event }
      } catch {
        /* a nearer brace was not the event */
      }
    }
    cursor = start - 1
  }
  return null
}

export function readEvents(payload: string, today = easternToday()): TreasureShow[] {
  const seen = new Set<string>()
  const shows: TreasureShow[] = []
  let from = 0
  while (from < payload.length) {
    const at = payload.indexOf('"cleaned_name":"', from)
    if (at < 0) break
    const found = enclosingEvent(payload, at)
    if (!found) {
      from = at + 16
      continue
    }
    from = found.start + found.raw.length
    const event = found.event
    if (!event.cleaned_name || !event.max_date || event.max_date < today) continue
    const key = event.id || event.cleaned_name
    if (seen.has(key)) continue
    seen.add(key)
    const days = (event.formattedDates ?? []).map((d) => d.date).filter(Boolean) as string[]
    const dateLabel = days.length > 1 ? `${days[0]} – ${days[days.length - 1]}` : days[0] || event.min_date || ''
    const city = event.city ?? ''
    const state = event.state ?? ''
    const place = [city, state].filter(Boolean).join(', ')
    const venue = event.venue_name ?? ''
    shows.push({
      slug: event.cleaned_name,
      url: `${ORIGIN}/events/${event.cleaned_name}`,
      title: event.name || event.cleaned_name,
      dateLabel,
      startDate: event.min_date || event.max_date,
      endDate: event.max_date,
      venue,
      city,
      state,
      location: venue ? `${venue} · ${place}` : place,
      poster: event.publicPosterUrl || '',
      posterAlt: event.name ? `${event.name} event poster` : 'Card show poster',
    })
  }
  shows.sort((a, b) => a.endDate.localeCompare(b.endDate) || a.title.localeCompare(b.title))
  return shows
}

async function postEvents(user: Record<string, string>, action: string) {
  return fetch(`${TREASURE_PROFILE}?tab=events`, {
    method: 'POST',
    headers: {
      accept: 'text/x-component',
      'content-type': 'text/plain;charset=UTF-8',
      'next-action': action,
    },
    body: JSON.stringify([1, 'Vending', true, user, '$undefined', '$undefined']),
  })
}

async function fetchShows(): Promise<TreasureShow[]> {
  const page = await fetch(TREASURE_PROFILE, { headers: { accept: 'text/html' } })
  if (!page.ok) throw new Error(`OnTreasure ${page.status}`)
  const html = await page.text()
  const user = extractUser(html)
  let res = await postEvents(user, actionId)
  let body = await res.text()
  if (!res.ok || !body.includes('"cleaned_name"')) {
    actionId = await findAction(html)
    res = await postEvents(user, actionId)
    body = await res.text()
    if (!res.ok || !body.includes('"cleaned_name"')) throw new Error('OnTreasure events did not load')
  }
  return readEvents(body)
}

export async function loadTreasureShows(): Promise<TreasureResult> {
  if (cache && Date.now() - cache.at < FRESH_MS) return cache.result
  try {
    const shows = await fetchShows()
    const result: TreasureResult = { status: 'ok', shows, fetchedAt: new Date().toISOString() }
    cache = { at: Date.now(), result }
    return result
  } catch (error) {
    console.error('[treasure-shows]', error instanceof Error ? error.message : error)
    if (cache) return cache.result
    return { status: 'unavailable', shows: [], fetchedAt: new Date().toISOString() }
  }
}
