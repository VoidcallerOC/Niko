import { randomUUID } from 'node:crypto'
import type { Product, SquareField } from './types'
import { SQUARE_SYNC_FIELDS, emptyProduct } from './types'
import { getProduct, listProducts, logActivity, newId, nowIso, putProduct, saveRevision, putSquareState, getSquareState } from './store'
import { isDemo } from './auth'

/**
 * Square, official Catalog + Inventory APIs only
 * (https://developer.squareup.com/reference/square). The access token lives
 * in NUXT_SQUARE_ACCESS_TOKEN on the server and never reaches the browser.
 *
 * Harris in Wonderland's catalog loader reads Square Online's undocumented
 * storefront editor endpoint; that path is deliberately NOT reused here. Only
 * its product shape (name, price, sold-out flag, stock, image, live/fallback
 * marker with a fetched-at time) informed the preview rows below.
 *
 * Rules:
 *  - Every sync is previewed first; `apply` only performs what the preview
 *    listed and the owner confirmed.
 *  - A local card is matched to Square by its stored squareId, never by name
 *    guesses, so nothing is created twice.
 *  - Nothing is ever deleted in Square or locally by a sync.
 *  - Field conflicts show both values; the owner picks the winner and may
 *    remember that choice per field (product.fieldOwners).
 */

export interface SquareItem {
  id: string
  version: number
  name: string
  description: string
  variationId: string | null
  variationVersion: number | null
  priceCents: number | null
  quantity: number | null
  updatedAt: string
}

export interface Conflict {
  productId: string
  title: string
  field: SquareField
  local: string | number | null
  square: string | number | null
  owner: 'local' | 'square'
}

export interface SyncPreview {
  source: 'square' | 'demo'
  fetchedAt: string
  imports: Array<{ squareId: string; name: string; priceCents: number | null; quantity: number | null }>
  conflicts: Conflict[]
  pushable: Array<{ productId: string; title: string; reason: 'new' | 'changed' }>
  linked: number
}

export interface ApplyPlan {
  imports: string[]
  resolutions: Array<{ productId: string; field: SquareField; winner: 'local' | 'square'; remember: boolean }>
  pushes: string[]
  confirm: boolean
}

function config() {
  const cfg = useRuntimeConfig()
  const token = String(cfg.square?.accessToken || process.env.SQUARE_ACCESS_TOKEN || '')
  const env = String(cfg.square?.env || process.env.SQUARE_ENV || 'production')
  const locationId = String(cfg.square?.locationId || process.env.SQUARE_LOCATION_ID || '')
  const origin = env === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
  return { token, env, locationId, origin }
}

export const squareConfigured = () => isDemo() || !!config().token

async function squareFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const { token, origin } = config()
  if (!token) throw createError({ statusCode: 503, statusMessage: 'Square is not connected. Add NUXT_SQUARE_ACCESS_TOKEN on the server.' })
  const res = await fetch(`${origin}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Square-Version': '2025-01-23',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as { errors?: Array<{ detail?: string; code?: string }> } & T
  if (!res.ok) {
    const detail = json.errors?.map((e) => e.detail || e.code).join('; ') || `Square responded ${res.status}`
    throw createError({ statusCode: 502, statusMessage: `Square: ${detail}` })
  }
  return json
}

// --- Demo catalog (labelled sample data; never a real account) --------------
const demoCatalog: SquareItem[] = [
  { id: 'SAMPLE-SQ-ITEM-1', version: 1, name: 'SAMPLE Charizard ex', description: 'Obsidian Flames 125/197', variationId: 'SAMPLE-SQ-VAR-1', variationVersion: 1, priceCents: 5000, quantity: 1, updatedAt: '2026-10-01T12:00:00Z' },
  { id: 'SAMPLE-SQ-ITEM-9', version: 1, name: 'SAMPLE Gengar VMAX', description: 'Fusion Strike', variationId: 'SAMPLE-SQ-VAR-9', variationVersion: 1, priceCents: 3500, quantity: 2, updatedAt: '2026-10-01T12:00:00Z' },
]

async function fetchCatalog(): Promise<{ items: SquareItem[]; source: 'square' | 'demo' }> {
  if (isDemo() && !config().token) {
    // Link the first sample card so the conflict flow has something to show.
    const linked = await getProduct('demo000000000001')
    if (linked && !linked.squareId) await putProduct({ ...linked, squareId: 'SAMPLE-SQ-ITEM-1', squareVariationId: 'SAMPLE-SQ-VAR-1' })
    return { items: demoCatalog.map((i) => ({ ...i })), source: 'demo' }
  }
  const items: SquareItem[] = []
  let cursor: string | undefined
  do {
    const page = await squareFetch<{ objects?: SquareObject[]; cursor?: string }>(`/v2/catalog/list?types=ITEM${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)
    for (const o of page.objects ?? []) {
      if (o.type !== 'ITEM' || !o.item_data || o.is_deleted) continue
      const v = o.item_data.variations?.[0]
      items.push({
        id: o.id,
        version: o.version ?? 0,
        name: o.item_data.name ?? '',
        description: o.item_data.description_plaintext ?? o.item_data.description ?? '',
        variationId: v?.id ?? null,
        variationVersion: v?.version ?? null,
        priceCents: typeof v?.item_variation_data?.price_money?.amount === 'number' ? v.item_variation_data.price_money.amount : null,
        quantity: null,
        updatedAt: o.updated_at ?? '',
      })
    }
    cursor = page.cursor
  } while (cursor)
  const { locationId } = config()
  const variationIds = items.map((i) => i.variationId).filter((x): x is string => !!x)
  if (locationId && variationIds.length) {
    for (let i = 0; i < variationIds.length; i += 100) {
      const counts = await squareFetch<{ counts?: Array<{ catalog_object_id: string; quantity?: string; state?: string }> }>('/v2/inventory/counts/batch-retrieve', {
        method: 'POST',
        body: { catalog_object_ids: variationIds.slice(i, i + 100), location_ids: [locationId] },
      })
      for (const c of counts.counts ?? []) {
        if (c.state && c.state !== 'IN_STOCK') continue
        const item = items.find((it) => it.variationId === c.catalog_object_id)
        if (item) item.quantity = Number(c.quantity ?? 0)
      }
    }
  }
  return { items, source: 'square' }
}

interface SquareObject {
  type: string
  id: string
  version?: number
  is_deleted?: boolean
  updated_at?: string
  item_data?: {
    name?: string
    description?: string
    description_plaintext?: string
    variations?: Array<{ id: string; version?: number; item_variation_data?: { price_money?: { amount?: number; currency?: string } } }>
  }
}

const fieldValue = (p: Product, f: SquareField): string | number | null => p[f]
const squareValue = (s: SquareItem, f: SquareField): string | number | null =>
  f === 'title' ? s.name : f === 'description' ? s.description : f === 'priceCents' ? s.priceCents : s.quantity

export async function previewSync(): Promise<SyncPreview> {
  const { items, source } = await fetchCatalog()
  const products = (await listProducts()).filter((p) => !p.deletedAt)
  const bySquareId = new Map(products.filter((p) => p.squareId).map((p) => [p.squareId as string, p]))
  const preview: SyncPreview = { source, fetchedAt: nowIso(), imports: [], conflicts: [], pushable: [], linked: bySquareId.size }

  for (const item of items) {
    const local = bySquareId.get(item.id)
    if (!local) {
      preview.imports.push({ squareId: item.id, name: item.name, priceCents: item.priceCents, quantity: item.quantity })
      continue
    }
    let changed = false
    for (const field of SQUARE_SYNC_FIELDS) {
      const sv = squareValue(item, field)
      if (sv === null && field === 'quantity') continue // no inventory data from Square
      const lv = fieldValue(local, field)
      if ((lv ?? '') === (sv ?? '')) continue
      changed = true
      preview.conflicts.push({ productId: local.id, title: local.title || item.name, field, local: lv, square: sv, owner: local.fieldOwners[field] ?? 'local' })
    }
    if (changed) preview.pushable.push({ productId: local.id, title: local.title, reason: 'changed' })
  }
  for (const p of products) {
    if (!p.squareId && p.availability === 'listed') preview.pushable.push({ productId: p.id, title: p.title, reason: 'new' })
  }
  await putSquareState({ ...(await getSquareState()), lastPreviewAt: preview.fetchedAt, lastError: null })
  return preview
}

export async function applySync(plan: ApplyPlan) {
  if (plan.confirm !== true) throw createError({ statusCode: 400, statusMessage: 'Confirm the sync first.' })
  const { items, source } = await fetchCatalog()
  const byId = new Map(items.map((i) => [i.id, i]))
  const now = nowIso()
  const report = { imported: 0, resolved: 0, pushed: 0, skipped: [] as string[], source }

  // 1. Imports: Square items → local drafts (never listed automatically, never priced beyond what Square states).
  const existing = (await listProducts()).filter((p) => p.squareId)
  for (const squareId of plan.imports) {
    const item = byId.get(squareId)
    if (!item) { report.skipped.push(`${squareId}: not in Square any more`); continue }
    if (existing.some((p) => p.squareId === squareId)) { report.skipped.push(`${item.name}: already linked`); continue }
    const draft: Product = {
      ...emptyProduct(now),
      id: newId(),
      title: item.name,
      description: item.description,
      priceCents: item.priceCents,
      quantity: item.quantity ?? 0,
      availability: 'draft',
      source: 'square',
      squareId: item.id,
      squareVariationId: item.variationId,
      fieldOwners: { title: 'square', description: 'square', priceCents: 'square', quantity: 'square' },
    }
    await putProduct(draft)
    report.imported += 1
  }

  // 2. Conflicts: apply the chosen winner locally; pushes carry local winners to Square.
  const toPush = new Set(plan.pushes)
  for (const r of plan.resolutions) {
    const local = await getProduct(r.productId)
    const item = local?.squareId ? byId.get(local.squareId) : undefined
    if (!local || !item) { report.skipped.push(`${r.productId}: not linked`); continue }
    const next: Product = { ...local, updatedAt: now }
    if (r.remember) next.fieldOwners = { ...next.fieldOwners, [r.field]: r.winner }
    if (r.winner === 'square') {
      const sv = squareValue(item, r.field)
      if (r.field === 'title') next.title = String(sv ?? '')
      else if (r.field === 'description') next.description = String(sv ?? '')
      else if (r.field === 'priceCents') next.priceCents = typeof sv === 'number' ? sv : null
      else if (r.field === 'quantity') next.quantity = typeof sv === 'number' ? sv : next.quantity
    } else {
      toPush.add(local.id)
    }
    await saveRevision('product', local.id, local)
    await putProduct(next)
    report.resolved += 1
  }

  // 3. Pushes: upsert the item in Square (new id for unlinked, existing id + version otherwise).
  for (const productId of toPush) {
    const p = await getProduct(productId)
    if (!p || p.deletedAt) continue
    if (!p.title || p.priceCents === null) { report.skipped.push(`${p?.title || productId}: needs a title and price before it can go to Square`); continue }
    if (source === 'demo') {
      const linkedId = p.squareId ?? `SAMPLE-SQ-ITEM-${p.id.slice(-4)}`
      await saveRevision('product', p.id, p)
      await putProduct({ ...p, squareId: linkedId, squareVariationId: p.squareVariationId ?? `SAMPLE-SQ-VAR-${p.id.slice(-4)}`, updatedAt: now })
      report.pushed += 1
      continue
    }
    const current = p.squareId ? byId.get(p.squareId) : undefined
    if (p.squareId && !current) { report.skipped.push(`${p.title}: linked Square item no longer exists`); continue }
    const result = await squareFetch<{ catalog_object?: SquareObject; id_mappings?: Array<{ client_object_id: string; object_id: string }> }>('/v2/catalog/object', {
      method: 'POST',
      body: {
        idempotency_key: randomUUID(),
        object: {
          type: 'ITEM',
          id: current?.id ?? '#item',
          ...(current ? { version: current.version } : {}),
          item_data: {
            name: p.title,
            description: p.description,
            variations: [
              {
                type: 'ITEM_VARIATION',
                id: current?.variationId ?? '#variation',
                ...(current?.variationVersion != null ? { version: current.variationVersion } : {}),
                item_variation_data: {
                  item_id: current?.id ?? '#item',
                  name: 'Regular',
                  pricing_type: 'FIXED_PRICING',
                  price_money: { amount: p.priceCents, currency: 'USD' },
                  track_inventory: true,
                },
              },
            ],
          },
        },
      },
    })
    const obj = result.catalog_object
    const squareId = obj?.id ?? current?.id ?? null
    const variationId = obj?.item_data?.variations?.[0]?.id ?? current?.variationId ?? null
    const { locationId } = config()
    if (locationId && variationId) {
      await squareFetch('/v2/inventory/changes/batch-create', {
        method: 'POST',
        body: {
          idempotency_key: randomUUID(),
          changes: [{ type: 'PHYSICAL_COUNT', physical_count: { catalog_object_id: variationId, state: 'IN_STOCK', location_id: locationId, quantity: String(p.quantity), occurred_at: now } }],
        },
      })
    }
    await saveRevision('product', p.id, p)
    await putProduct({ ...p, squareId, squareVariationId: variationId, updatedAt: now })
    report.pushed += 1
  }

  await putSquareState({ ...(await getSquareState()), lastApplyAt: now, lastError: null })
  await logActivity({ kind: 'square', entity: 'square', entityId: null, summary: `Square sync (${source}): ${report.imported} imported, ${report.resolved} resolved, ${report.pushed} pushed, ${report.skipped.length} skipped` })
  return report
}

export function squareStatus() {
  const { token, env, locationId } = config()
  return {
    configured: !!token,
    demo: isDemo() && !token,
    env,
    hasLocation: !!locationId,
    note: token
      ? `Connected to Square ${env} via NUXT_SQUARE_ACCESS_TOKEN${locationId ? '' : '. Add NUXT_SQUARE_LOCATION_ID to sync quantities.'}`
      : isDemo()
        ? 'Demo mode: a labelled SAMPLE Square catalog stands in for a real account. No real Square account is contacted.'
        : 'Not connected. Nino can connect later by adding NUXT_SQUARE_ACCESS_TOKEN (and NUXT_SQUARE_LOCATION_ID) on the server. The admin works fully without it.',
  }
}
