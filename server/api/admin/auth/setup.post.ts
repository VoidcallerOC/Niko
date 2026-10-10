import { authConfig, hashPassword, loginAllowed, recordFailure, signInOwner } from '../../../utils/admin/auth'
import { getOwnerBinding, putOwnerBinding } from '../../../utils/admin/squareAuth'
import { logActivity, nowIso } from '../../../utils/admin/store'

/**
 * First-run owner setup: Nino picks his email and password the first time he
 * opens the admin. Allowed only while no owner account exists. If
 * NUXT_ADMIN_SETUP_CODE is set, the same code must be entered (a one-time
 * invite Nick can hand him without knowing his password).
 */
export default defineEventHandler(async (event) => {
  const cfg = authConfig()
  if (cfg.mode === 'demo') throw createError({ statusCode: 400, statusMessage: 'Demo mode has no owner setup.' })
  if (cfg.mode === 'unconfigured' || !cfg.secret) throw createError({ statusCode: 503, statusMessage: cfg.reason ?? 'Sign-in is not configured.' })
  if (await getOwnerBinding()) throw createError({ statusCode: 409, statusMessage: 'The owner account already exists. Sign in instead.' })
  if (!loginAllowed(event)) throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Wait 15 minutes and try again.' })

  const body = await readBody<{ email?: unknown; password?: unknown; confirm?: unknown; code?: unknown }>(event).catch(() => ({}) as Record<string, unknown>)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const confirm = typeof body.confirm === 'string' ? body.confirm : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''

  const required = String(useRuntimeConfig().adminSetupCode || '')
  if (required && code !== required) {
    recordFailure(event)
    throw createError({ statusCode: 403, statusMessage: 'That setup code is not right.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address.' })
  if (password.length < 12) throw createError({ statusCode: 400, statusMessage: 'Use a password of at least 12 characters.' })
  if (password !== confirm) throw createError({ statusCode: 400, statusMessage: 'The two passwords do not match.' })

  const now = nowIso()
  await putOwnerBinding({ merchantId: '', email, businessName: '', passwordHash: hashPassword(password), boundAt: now, source: 'password' })
  await signInOwner(event, { via: 'password', email })
  await logActivity({ kind: 'settings', entity: 'settings', entityId: 'owner', summary: `Owner account created for ${email}` })
  return { ok: true }
})
