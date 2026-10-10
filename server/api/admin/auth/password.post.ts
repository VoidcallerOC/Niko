import { hashPassword, isDemo, requireOwner, verifyPassword } from '../../../utils/admin/auth'
import { MIN_PASSWORD, getOwner, putOwner } from '../../../utils/admin/owner'
import { logActivity } from '../../../utils/admin/store'

/** Signed-in owner changes his password. Every other session is signed out. */
export default defineEventHandler(async (event) => {
  if (isDemo()) throw createError({ statusCode: 400, statusMessage: 'Demo mode has no owner password.' })
  const session = await requireOwner(event)
  const body = await readBody<Record<string, unknown>>(event).catch(() => ({}) as Record<string, unknown>)
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const owner = await getOwner()
  if (!owner) throw createError({ statusCode: 409, statusMessage: 'No owner account exists yet.' })
  if (!verifyPassword(str(body.current), owner.passwordHash)) throw createError({ statusCode: 401, statusMessage: 'The current password is wrong.' })
  if (str(body.password).length < MIN_PASSWORD) throw createError({ statusCode: 400, statusMessage: `Use a password of at least ${MIN_PASSWORD} characters.` })
  if (str(body.password) !== str(body.confirm)) throw createError({ statusCode: 400, statusMessage: 'The two passwords do not match.' })

  const next = { ...owner, passwordHash: hashPassword(str(body.password)), sessionVersion: owner.sessionVersion + 1 }
  await putOwner(next)
  await session.update({ sessionVersion: next.sessionVersion })
  await logActivity({ kind: 'settings', entity: 'settings', entityId: 'owner', summary: 'Owner password changed; other sessions signed out' })
  return { ok: true }
})
