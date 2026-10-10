import type { Availability, GradeDetails, Product, StoreEvent, Settings, SquareField, PublicCopy } from './types'
import { AVAILABILITY, EMPTY_COPY, SQUARE_SYNC_FIELDS, emptyProduct } from './types'

type Json = Record<string, unknown>

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })

export function parsePriceCents(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.round(v) : null
  if (typeof v === 'string') {
    const n = Number(v.replace(/[$,\s]/g, ''))
    if (!Number.isFinite(n) || n < 0) throw bad('Price must be a number of dollars, or empty.')
    return Math.round(n * 100)
  }
  throw bad('Price must be a number of dollars, or empty.')
}

export function parseQuantity(v: unknown): number {
  if (v === '' || v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isInteger(n) || n < 0 || n > 100000) throw bad('Quantity must be a whole number, 0 or more.')
  return n
}

function parseAvailability(v: unknown, fallback: Availability): Availability {
  if (v === undefined) return fallback
  if (typeof v === 'string' && (AVAILABILITY as readonly string[]).includes(v)) return v as Availability
  throw bad('Availability must be draft, listed, hidden or sold.')
}

function parseGrade(v: unknown, fallback: GradeDetails): GradeDetails {
  if (!v || typeof v !== 'object') return fallback
  const g = v as Json
  return { company: str(g.company, 40), grade: str(g.grade, 20), certNumber: str(g.certNumber, 60) }
}

function parsePhotos(v: unknown, fallback: Product['photos']): Product['photos'] {
  if (v === undefined) return fallback
  if (!Array.isArray(v)) throw bad('Photos must be a list.')
  return v.slice(0, 12).map((p) => {
    const ph = (p ?? {}) as Json
    const src = str(ph.src, 500)
    if (!/^(\/media\/[a-f0-9]{16}|\/media\/ig\/[\w.-]+|https:\/\/[^\s]+)$/.test(src)) throw bad('Photo source is not allowed.')
    return {
      id: str(ph.id, 40) || src,
      src,
      alt: str(ph.alt, 200),
      ...(typeof ph.width === 'number' ? { width: ph.width } : {}),
      ...(typeof ph.height === 'number' ? { height: ph.height } : {}),
    }
  })
}

function parseOwners(v: unknown, fallback: Product['fieldOwners']): Product['fieldOwners'] {
  if (v === undefined) return fallback
  if (!v || typeof v !== 'object') throw bad('Field owners must be an object.')
  const out: Product['fieldOwners'] = {}
  for (const field of SQUARE_SYNC_FIELDS) {
    const owner = (v as Json)[field]
    if (owner === 'local' || owner === 'square') out[field as SquareField] = owner
  }
  return out
}

/** Merge a request body onto an existing (or empty) product. Unknown keys are ignored. */
export function applyProductInput(base: Product | null, body: unknown, now: string): Product {
  if (!body || typeof body !== 'object') throw bad('Expected a product object.')
  const b = body as Json
  const cur = base ?? emptyProduct(now)
  const next: Product = {
    ...cur,
    title: b.title === undefined ? cur.title : str(b.title, 160),
    game: b.game === undefined ? cur.game : str(b.game, 80),
    set: b.set === undefined ? cur.set : str(b.set, 120),
    cardNumber: b.cardNumber === undefined ? cur.cardNumber : str(b.cardNumber, 40),
    rarity: b.rarity === undefined ? cur.rarity : str(b.rarity, 60),
    condition: b.condition === undefined ? cur.condition : str(b.condition, 40),
    grade: parseGrade(b.grade, cur.grade),
    priceCents: b.priceCents === undefined ? cur.priceCents : parsePriceCents(b.priceCents),
    quantity: b.quantity === undefined ? cur.quantity : parseQuantity(b.quantity),
    availability: parseAvailability(b.availability, cur.availability),
    photos: parsePhotos(b.photos, cur.photos),
    description: b.description === undefined ? cur.description : str(b.description, 2000),
    notes: b.notes === undefined ? cur.notes : str(b.notes, 2000),
    fieldOwners: parseOwners(b.fieldOwners, cur.fieldOwners),
    updatedAt: now,
  }
  if (next.availability === 'listed') {
    if (!next.title) throw bad('A listed card needs a title.')
    if (next.priceCents === null) throw bad('Set a price before listing, or keep it as a draft.')
  }
  return next
}

export function applyEventInput(base: StoreEvent | null, body: unknown, now: string): StoreEvent {
  if (!body || typeof body !== 'object') throw bad('Expected an event object.')
  const b = body as Json
  const cur: StoreEvent = base ?? {
    id: '', title: '', date: '', endDate: '', hours: '', venue: '', city: '', state: '', url: '', notes: '',
    published: false, createdAt: now, updatedAt: now, deletedAt: null,
  }
  const date = b.date === undefined ? cur.date : str(b.date, 10)
  const endDate = b.endDate === undefined ? cur.endDate || date : str(b.endDate, 10) || date
  const isoDay = /^\d{4}-\d{2}-\d{2}$/
  if (!isoDay.test(date)) throw bad('Pick a date for the event.')
  if (!isoDay.test(endDate) || endDate < date) throw bad('The end date must be on or after the start date.')
  const url = b.url === undefined ? cur.url : str(b.url, 500)
  if (url && !/^https?:\/\//.test(url)) throw bad('Links must start with http:// or https://.')
  const next: StoreEvent = {
    ...cur,
    title: b.title === undefined ? cur.title : str(b.title, 160),
    date,
    endDate,
    hours: b.hours === undefined ? cur.hours : str(b.hours, 80),
    venue: b.venue === undefined ? cur.venue : str(b.venue, 160),
    city: b.city === undefined ? cur.city : str(b.city, 80),
    state: b.state === undefined ? cur.state : str(b.state, 40),
    url,
    notes: b.notes === undefined ? cur.notes : str(b.notes, 1000),
    published: b.published === undefined ? cur.published : Boolean(b.published),
    updatedAt: now,
  }
  if (!next.title) throw bad('Give the event a name.')
  return next
}

export function applySettingsInput(cur: Settings, body: unknown, now: string): Settings {
  if (!body || typeof body !== 'object') throw bad('Expected a settings object.')
  const b = body as Json
  const copyIn = (b.copy ?? {}) as Json
  const copy: PublicCopy = { ...cur.copy }
  for (const key of Object.keys(EMPTY_COPY) as (keyof PublicCopy)[]) {
    if (copyIn[key] !== undefined) copy[key] = str(copyIn[key], key.endsWith('Intro') ? 600 : 300)
  }
  for (const key of ['instagramUrl', 'onTreasureUrl'] as const) {
    if (copy[key] && !/^https:\/\//.test(copy[key])) throw bad(`${key === 'instagramUrl' ? 'Instagram' : 'OnTreasure'} link must start with https://`)
  }
  const ids = (v: unknown, fallback: string[]) =>
    v === undefined ? fallback : Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 64)).slice(0, 100) : fallback
  const threshold = b.lowStockThreshold === undefined ? cur.lowStockThreshold : parseQuantity(b.lowStockThreshold)
  const ig = (b.instagram ?? {}) as Json
  return {
    copy,
    featuredProductIds: ids(b.featuredProductIds, cur.featuredProductIds),
    instagram: { hidden: ids(ig.hidden, cur.instagram.hidden), featured: ids(ig.featured, cur.instagram.featured) },
    lowStockThreshold: threshold,
    updatedAt: now,
  }
}
