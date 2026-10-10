/**
 * Admin data model. Everything here is owner-entered. There is no built-in
 * catalog: an empty store shows an empty inventory.
 */

export const AVAILABILITY = ['draft', 'listed', 'hidden', 'sold'] as const
export type Availability = (typeof AVAILABILITY)[number]

export const CONDITIONS = ['', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'] as const
export type Condition = (typeof CONDITIONS)[number]

export const PRODUCT_SOURCES = ['manual', 'scan', 'square', 'demo'] as const
export type ProductSource = (typeof PRODUCT_SOURCES)[number]

export interface PhotoRef {
  id: string
  /** Public URL the browser can load (uploads are served from /media/:id). */
  src: string
  alt: string
  width?: number
  height?: number
}

export interface GradeDetails {
  /** e.g. PSA, CGC, BGS, TAG. Empty when raw. */
  company: string
  /** e.g. "10", "9.5". Empty when raw. */
  grade: string
  certNumber: string
}

/** Fields Square and the local record may both carry; ownership says who wins. */
export const SQUARE_SYNC_FIELDS = ['title', 'description', 'priceCents', 'quantity'] as const
export type SquareField = (typeof SQUARE_SYNC_FIELDS)[number]
export type FieldOwner = 'local' | 'square'

export interface Product {
  id: string
  title: string
  game: string
  set: string
  cardNumber: string
  rarity: string
  condition: Condition | string
  grade: GradeDetails
  /** Whole cents, or null when no price has been decided. */
  priceCents: number | null
  quantity: number
  availability: Availability
  photos: PhotoRef[]
  description: string
  notes: string
  source: ProductSource
  /** Square catalog object id once linked; never guessed. */
  squareId: string | null
  squareVariationId: string | null
  fieldOwners: Partial<Record<SquareField, FieldOwner>>
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface StoreEvent {
  id: string
  title: string
  /** YYYY-MM-DD */
  date: string
  /** YYYY-MM-DD, same as date for single-day events */
  endDate: string
  /** Free text, e.g. "10am–4pm". Optional. */
  hours: string
  venue: string
  city: string
  state: string
  /** OnTreasure event page or other link. Optional. */
  url: string
  notes: string
  published: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface PublicCopy {
  heroEyebrow: string
  heroHeadline: string
  heroIntro: string
  feedIntro: string
  aboutIntro: string
  contactIntro: string
  instagramUrl: string
  onTreasureUrl: string
  email: string
  phone: string
}

export interface Settings {
  copy: PublicCopy
  featuredProductIds: string[]
  instagram: {
    hidden: string[]
    featured: string[]
  }
  lowStockThreshold: number
  updatedAt: string
}

export interface ActivityEntry {
  id: string
  at: string
  kind: 'create' | 'update' | 'delete' | 'restore' | 'bulk' | 'settings' | 'square' | 'instagram'
  entity: 'product' | 'event' | 'settings' | 'instagram' | 'square'
  entityId: string | null
  summary: string
}

export interface Revision<T> {
  id: string
  at: string
  entity: 'product' | 'event' | 'settings'
  entityId: string
  before: T
}

export const EMPTY_COPY: PublicCopy = {
  heroEyebrow: '',
  heroHeadline: '',
  heroIntro: '',
  feedIntro: '',
  aboutIntro: '',
  contactIntro: '',
  instagramUrl: '',
  onTreasureUrl: '',
  email: '',
  phone: '',
}

export const DEFAULT_SETTINGS: Settings = {
  copy: { ...EMPTY_COPY },
  featuredProductIds: [],
  instagram: { hidden: [], featured: [] },
  lowStockThreshold: 1,
  updatedAt: '',
}

export function emptyProduct(now: string): Product {
  return {
    id: '',
    title: '',
    game: '',
    set: '',
    cardNumber: '',
    rarity: '',
    condition: '',
    grade: { company: '', grade: '', certNumber: '' },
    priceCents: null,
    quantity: 1,
    availability: 'draft',
    photos: [],
    description: '',
    notes: '',
    source: 'manual',
    squareId: null,
    squareVariationId: null,
    fieldOwners: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}
