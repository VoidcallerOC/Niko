import { applySync, squareConfigured, type ApplyPlan } from '../../../utils/admin/square'
import { SQUARE_SYNC_FIELDS } from '../../../utils/admin/types'
import { getSquareState, putSquareState } from '../../../utils/admin/store'

export default defineEventHandler(async (event) => {
  if (!squareConfigured()) throw createError({ statusCode: 503, statusMessage: 'Square is not connected.' })
  const body = (await readBody(event)) as Partial<ApplyPlan> | null
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 500) : [])
  const resolutions = Array.isArray(body?.resolutions)
    ? body.resolutions
        .filter((r): r is ApplyPlan['resolutions'][number] => !!r && typeof r === 'object' && typeof r.productId === 'string' && (SQUARE_SYNC_FIELDS as readonly string[]).includes(r.field) && (r.winner === 'local' || r.winner === 'square'))
        .map((r) => ({ productId: r.productId, field: r.field, winner: r.winner, remember: r.remember === true }))
    : []
  const plan: ApplyPlan = { imports: strings(body?.imports), resolutions, pushes: strings(body?.pushes), confirm: body?.confirm === true }
  try {
    return await applySync(plan)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Square sync failed'
    await putSquareState({ ...(await getSquareState()), lastError: message })
    throw error
  }
})
