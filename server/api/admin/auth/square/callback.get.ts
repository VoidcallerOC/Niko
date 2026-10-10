import { anonymousSession, getOwnerSession, signInOwner } from '../../../../utils/admin/auth'
import { logActivity, nowIso } from '../../../../utils/admin/store'
import { ensureDemoSeed } from '../../../../utils/admin/demo'
import {
  DEMO_IDENTITY, checkOwnerBinding, exchangeCode, fetchIdentity, getOwnerBinding, putConnection, putOwnerBinding,
  redirectUrlFor, seal, squareLoginIsDemo, type SquareIdentity,
} from '../../../../utils/admin/squareAuth'

const fail = (event: Parameters<typeof sendRedirect>[0], code: string) => sendRedirect(event, `/admin/login?error=${encodeURIComponent(code)}`, 302)

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const session = await anonymousSession(event)
  const expected = session.data.oauthState
  const next = session.data.oauthNext || '/admin'
  await session.update({ oauthState: undefined, oauthNext: undefined })

  if (typeof q.error === 'string') return fail(event, q.error === 'access_denied' ? 'denied' : 'square')
  if (!expected || q.state !== expected) return fail(event, 'state')

  let identity: SquareIdentity
  let sealed = ''
  let expiresAt = ''
  if (q.demo === '1' && squareLoginIsDemo()) {
    identity = DEMO_IDENTITY
  } else {
    if (typeof q.code !== 'string' || !q.code) return fail(event, 'square')
    try {
      const tokens = await exchangeCode(q.code, redirectUrlFor(event))
      identity = await fetchIdentity(tokens.accessToken, tokens.merchantId)
      sealed = seal({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
      expiresAt = tokens.expiresAt
    } catch (error) {
      console.error('[square oauth]', error instanceof Error ? error.message : error)
      return fail(event, 'square')
    }
  }

  const existing = await getOwnerBinding()
  const signedIn = !!(await getOwnerSession(event))
  const check = checkOwnerBinding(existing, identity, signedIn)
  if (!check.ok) return fail(event, existing && !existing.merchantId ? 'linkemail' : 'notowner')

  const now = nowIso()
  if (check.first) {
    await putOwnerBinding({ merchantId: identity.merchantId, email: identity.email, businessName: identity.businessName, boundAt: now, source: identity.source })
  } else if (check.link && existing) {
    await putOwnerBinding({ ...existing, merchantId: identity.merchantId, businessName: identity.businessName || existing.businessName, email: existing.email || identity.email })
  }
  await putConnection({
    sealed,
    expiresAt,
    merchantId: identity.merchantId,
    businessName: identity.businessName,
    email: identity.email,
    locationId: identity.locationId,
    locationName: identity.locationName,
    connectedAt: now,
    source: identity.source,
  })
  await signInOwner(event, { via: 'square', email: existing?.email || identity.email, businessName: identity.businessName, demo: identity.source === 'demo' })
  await ensureDemoSeed()
  await logActivity({
    kind: 'square',
    entity: 'square',
    entityId: identity.merchantId,
    summary: check.first ? `Owner account bound to Square (${identity.email || identity.merchantId})` : check.link ? `Square account linked to the owner (${identity.businessName || identity.merchantId})` : 'Signed in with Square',
  })
  return sendRedirect(event, next, 302)
})
