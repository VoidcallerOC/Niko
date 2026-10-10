import {
  assertAttemptsAllowed, assertSetupNotLocked, authConfig, clearFailures, hashPassword, recordFailure, recordSetupFailure, signInAsOwner,
} from '../../../utils/admin/auth'
import { EMAIL_RE, MIN_PASSWORD, configuredSetupCode, getOwner, newOwnerId, putOwner, setupCodeMatches, type OwnerAccount } from '../../../utils/admin/owner'
import { logActivity, nowIso } from '../../../utils/admin/store'

/**
 * First-run owner setup. Open only while no owner account exists, and only
 * with the one-time code in NUXT_ADMIN_SETUP_CODE, which Nick hands to Nino.
 * Once the account exists this route refuses everything (409), so the code
 * cannot be used twice.
 */
export default defineEventHandler(async (event) => {
  const cfg = authConfig()
  if (cfg.mode === 'demo') throw createError({ statusCode: 400, statusMessage: 'Demo mode has no owner account.' })
  if (cfg.mode === 'unconfigured') throw createError({ statusCode: 503, statusMessage: cfg.reason ?? 'The admin is not configured.' })
  if (await getOwner()) throw createError({ statusCode: 409, statusMessage: 'The owner account already exists. Sign in instead.' })
  const required = configuredSetupCode()
  if (!required) throw createError({ statusCode: 503, statusMessage: 'Setup is closed until Nick sets NUXT_ADMIN_SETUP_CODE.' })
  await assertSetupNotLocked()
  await assertAttemptsAllowed(event, 'setup')

  const body = await readBody<Record<string, unknown>>(event).catch(() => ({}) as Record<string, unknown>)
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const email = str(body.email).trim().toLowerCase()
  const password = str(body.password)
  const confirm = str(body.confirm)
  const code = str(body.code)

  if (!setupCodeMatches(code, required)) {
    await recordFailure(event, 'setup')
    await recordSetupFailure()
    throw createError({ statusCode: 403, statusMessage: 'That setup code is not right.' })
  }
  if (!EMAIL_RE.test(email)) throw createError({ statusCode: 400, statusMessage: 'Enter a valid email address.' })
  if (password.length < MIN_PASSWORD) throw createError({ statusCode: 400, statusMessage: `Use a password of at least ${MIN_PASSWORD} characters.` })
  if (password !== confirm) throw createError({ statusCode: 400, statusMessage: 'The two passwords do not match.' })

  // Re-check right before writing so two simultaneous submissions cannot both win.
  if (await getOwner()) throw createError({ statusCode: 409, statusMessage: 'The owner account already exists. Sign in instead.' })
  const owner: OwnerAccount = {
    id: newOwnerId(),
    email,
    passwordHash: hashPassword(password),
    merchantId: '',
    businessName: '',
    createdAt: nowIso(),
    sessionVersion: 1,
  }
  await putOwner(owner)
  const stored = await getOwner()
  if (stored?.id !== owner.id) throw createError({ statusCode: 409, statusMessage: 'The owner account was just created by another request. Sign in instead.' })

  await clearFailures(event, 'setup')
  await signInAsOwner(event, owner, 'password')
  await logActivity({ kind: 'settings', entity: 'settings', entityId: 'owner', summary: `Owner account created for ${email}` })
  return { ok: true }
})
