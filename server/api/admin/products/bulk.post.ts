import { getProduct, logActivity, nowIso, putProduct, saveRevision } from '../../../utils/admin/store'
import type { Availability } from '../../../utils/admin/types'

const ACTIONS = new Set(['listed', 'hidden', 'sold', 'draft', 'trash', 'restore'])

/**
 * Bulk change. The client must send `confirm: true` after showing the owner
 * what will change; without it nothing is written. Every touched card keeps
 * a revision, and trash is reversible.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: unknown; action?: unknown; confirm?: unknown }>(event)
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === 'string').slice(0, 500) : []
  const action = typeof body?.action === 'string' && ACTIONS.has(body.action) ? body.action : ''
  if (!ids.length || !action) throw createError({ statusCode: 400, statusMessage: 'Choose cards and an action.' })
  if (body?.confirm !== true) throw createError({ statusCode: 400, statusMessage: 'Confirm the bulk change first.' })

  const now = nowIso()
  let changed = 0
  for (const id of ids) {
    const p = await getProduct(id)
    if (!p) continue
    await saveRevision('product', id, p)
    if (action === 'trash') await putProduct({ ...p, deletedAt: now, updatedAt: now })
    else if (action === 'restore') await putProduct({ ...p, deletedAt: null, updatedAt: now })
    else {
      const availability = action as Availability
      if (availability === 'listed' && (!p.title || p.priceCents === null)) continue
      await putProduct({ ...p, availability, updatedAt: now })
    }
    changed += 1
  }
  await logActivity({ kind: 'bulk', entity: 'product', entityId: null, summary: `Bulk ${action}: ${changed} of ${ids.length} cards` })
  return { changed, skipped: ids.length - changed }
})
