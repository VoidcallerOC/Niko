import { hashPassword, verifyPassword, requireOwner } from '../../../utils/admin/auth'
import { getOwnerBinding, putOwnerBinding } from '../../../utils/admin/squareAuth'
import { logActivity, nowIso } from '../../../utils/admin/store'

/** Signed-in owner sets or changes his password (and email, for a Square-only owner). */
export default defineEventHandler(async (event) => {
  const session = await requireOwner(event)
  const body = await readBody<{ email?: unknown; current?: unknown; password?: unknown; confirm?: unknown }>(event).catch(() => ({}) as Record<string, unknown>)
  const password = typeof body.password === 'string' ? body.password : ''
  const confirm = typeof body.confirm === 'string' ? body.confirm : ''
  const current = typeof body.current === 'string' ? body.current : ''
  const emailIn = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  const owner = await getOwnerBinding()
  if (!owner) throw createError({ statusCode: 409, statusMessage: 'No owner account exists yet.' })
  if (owner.passwordHash && !verifyPassword(current, owner.passwordHash)) throw createError({ statusCode: 401, statusMessage: 'The current password is wrong.' })
  if (password.length < 12) throw createError({ statusCode: 400, statusMessage: 'Use a password of at least 12 characters.' })
  if (password !== confirm) throw createError({ statusCode: 400, statusMessage: 'The two passwords do not match.' })
  const email = owner.email || emailIn
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address for signing in.' })

  await putOwnerBinding({ ...owner, email, passwordHash: hashPassword(password), boundAt: owner.boundAt || nowIso() })
  await session.update({ email })
  await logActivity({ kind: 'settings', entity: 'settings', entityId: 'owner', summary: owner.passwordHash ? 'Owner password changed' : 'Owner password set' })
  return { ok: true, email }
})
