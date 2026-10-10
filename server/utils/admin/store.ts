import { randomBytes } from 'node:crypto'
import type { ActivityEntry, Product, Revision, Settings, StoreEvent } from './types'
import { DEFAULT_SETTINGS } from './types'

/**
 * Persistence: Nitro's `useStorage('admin')`, mounted in nuxt.config on a
 * filesystem driver (`.data/admin`, or NUXT_ADMIN_DATA_DIR). One JSON file per
 * record. Swap the mount for a durable driver (Vercel Blob/KV, Redis, S3)
 * before production: Vercel's function filesystem does not persist.
 */
const storage = () => useStorage('admin')

export const newId = () => randomBytes(8).toString('hex')
export const nowIso = () => new Date().toISOString()

async function listPrefix<T>(prefix: string): Promise<T[]> {
  const keys = await storage().getKeys(prefix)
  const items = await Promise.all(keys.map((k) => storage().getItem<T>(k)))
  return items.filter((x) => x !== null && x !== undefined) as T[]
}

// Products ------------------------------------------------------------------
export const listProducts = () => listPrefix<Product>('products:')
export const getProduct = (id: string) => storage().getItem<Product>(`products:${id}`)
export const putProduct = (p: Product) => storage().setItem(`products:${p.id}`, p)
export const removeProductForever = (id: string) => storage().removeItem(`products:${id}`)

// Events --------------------------------------------------------------------
export const listEvents = () => listPrefix<StoreEvent>('events:')
export const getEvent = (id: string) => storage().getItem<StoreEvent>(`events:${id}`)
export const putEvent = (e: StoreEvent) => storage().setItem(`events:${e.id}`, e)

// Settings ------------------------------------------------------------------
export async function getSettings(): Promise<Settings> {
  const saved = await storage().getItem<Partial<Settings>>('settings')
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    copy: { ...DEFAULT_SETTINGS.copy, ...(saved?.copy ?? {}) },
    instagram: { ...DEFAULT_SETTINGS.instagram, ...(saved?.instagram ?? {}) },
  }
}
export const putSettings = (s: Settings) => storage().setItem('settings', s)

// Revisions (recoverable state before an overwrite) --------------------------
const REVISIONS_PER_ENTITY = 10
export async function saveRevision<T>(entity: Revision<T>['entity'], entityId: string, before: T) {
  const id = newId()
  const rev: Revision<T> = { id, at: nowIso(), entity, entityId, before }
  await storage().setItem(`revisions:${entity}:${entityId}:${rev.at.replace(/[:.]/g, '-')}-${id}`, rev)
  const keys = (await storage().getKeys(`revisions:${entity}:${entityId}:`)).sort()
  for (const key of keys.slice(0, Math.max(0, keys.length - REVISIONS_PER_ENTITY))) {
    await storage().removeItem(key)
  }
}
export async function listRevisions<T>(entity: Revision<T>['entity'], entityId: string) {
  const keys = (await storage().getKeys(`revisions:${entity}:${entityId}:`)).sort().reverse()
  const revs = await Promise.all(keys.map((k) => storage().getItem<Revision<T>>(k)))
  return revs.filter((r): r is Revision<T> => !!r)
}

// Activity log (dashboard "recent edits") ------------------------------------
const ACTIVITY_LIMIT = 200
export async function logActivity(entry: Omit<ActivityEntry, 'id' | 'at'>) {
  const full: ActivityEntry = { id: newId(), at: nowIso(), ...entry }
  await storage().setItem(`activity:${full.at.replace(/[:.]/g, '-')}-${full.id}`, full)
  const keys = (await storage().getKeys('activity:')).sort()
  for (const key of keys.slice(0, Math.max(0, keys.length - ACTIVITY_LIMIT))) {
    await storage().removeItem(key)
  }
}
export async function recentActivity(limit = 20): Promise<ActivityEntry[]> {
  const keys = (await storage().getKeys('activity:')).sort().reverse().slice(0, limit)
  const items = await Promise.all(keys.map((k) => storage().getItem<ActivityEntry>(k)))
  return items.filter((x): x is ActivityEntry => !!x)
}

// Uploads -------------------------------------------------------------------
export interface StoredUpload {
  id: string
  type: string
  size: number
  createdAt: string
}
export const putUpload = (id: string, meta: StoredUpload, bytes: Buffer) =>
  Promise.all([
    storage().setItem(`uploads:${id}:meta`, meta),
    storage().setItemRaw(`uploads:${id}:bin`, bytes),
  ])
export const getUploadMeta = (id: string) => storage().getItem<StoredUpload>(`uploads:${id}:meta`)
export const getUploadBytes = (id: string) => storage().getItemRaw(`uploads:${id}:bin`)

// Square link bookkeeping ----------------------------------------------------
export interface SquareSyncState {
  lastPreviewAt: string | null
  lastApplyAt: string | null
  lastError: string | null
}
export const getSquareState = async (): Promise<SquareSyncState> =>
  (await storage().getItem<SquareSyncState>('square:state')) ?? { lastPreviewAt: null, lastApplyAt: null, lastError: null }
export const putSquareState = (s: SquareSyncState) => storage().setItem('square:state', s)
