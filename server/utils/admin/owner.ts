import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * The single owner account, created once through first-run setup.
 *
 * - email + password are chosen by Nino; only an scrypt hash is stored.
 * - merchantId/businessName are filled when he connects Square from the admin.
 * - sessionVersion bumps on password change so older cookies stop working.
 */
export interface OwnerAccount {
  id: string
  email: string
  passwordHash: string
  merchantId: string
  /** Square environment the merchant link belongs to (production | sandbox). */
  squareEnv?: 'production' | 'sandbox'
  businessName: string
  createdAt: string
  sessionVersion: number
}

const store = () => useStorage('admin')

export const getOwner = () => store().getItem<OwnerAccount>('owner')
export const putOwner = (o: OwnerAccount) => store().setItem('owner', o)
export const newOwnerId = () => randomBytes(12).toString('hex')

/** Setup code from NUXT_ADMIN_SETUP_CODE; '' when unset or too short to be safe. */
export const MIN_SETUP_CODE = 12
export function configuredSetupCode() {
  const code = String(useRuntimeConfig().adminSetupCode || '').trim()
  return code.length >= MIN_SETUP_CODE ? code : ''
}

/** Constant-time comparison of the entered code with the configured one. */
export function setupCodeMatches(entered: string, configured: string) {
  if (!configured) return false
  const a = createHash('sha256').update(entered.trim()).digest()
  const b = createHash('sha256').update(configured).digest()
  return timingSafeEqual(a, b)
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD = 12

/**
 * Who may finish a Square OAuth round trip.
 *  connect → the signed-in owner. Allowed when no Square account is linked
 *            yet, or the same merchant reconnects. A different merchant must
 *            disconnect the current one first.
 *  signin  → nobody is signed in. Allowed only for the merchant the owner
 *            already linked in the current Square environment.
 */
/** The owner's merchant link for this Square environment, or '' (a Sandbox link never counts in Production). */
export function linkedMerchant(owner: Pick<OwnerAccount, 'merchantId' | 'squareEnv'> | null, env: 'production' | 'sandbox') {
  if (!owner?.merchantId) return ''
  return (owner.squareEnv ?? 'production') === env ? owner.merchantId : ''
}

export function checkSquareAccess(
  owner: Pick<OwnerAccount, 'merchantId' | 'email' | 'squareEnv'> | null,
  identity: { merchantId: string; email: string },
  intent: 'connect' | 'signin',
  env: 'production' | 'sandbox' = 'production',
): { ok: true } | { ok: false; code: string } {
  if (!owner) return { ok: false, code: 'noowner' }
  const linked = linkedMerchant(owner, env)
  if (intent === 'connect') {
    // The first merchant authorized in this environment becomes the owner's Square account.
    if (linked && linked !== identity.merchantId) return { ok: false, code: 'othermerchant' }
    return { ok: true }
  }
  if (!linked) return { ok: false, code: 'nosquare' }
  // The merchant id is the binding: it was linked by the signed-in owner, so his
  // Square email may differ from the email he chose for the admin.
  if (linked !== identity.merchantId) return { ok: false, code: 'notowner' }
  return { ok: true }
}
