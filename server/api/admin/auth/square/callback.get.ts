import { anonymousSession, getOwnerSession, signInAsOwner } from '../../../../utils/admin/auth'
import { checkSquareAccess, getOwner, putOwner } from '../../../../utils/admin/owner'
import { logActivity, nowIso } from '../../../../utils/admin/store'
import {
  DEMO_IDENTITY, exchangeCode, fetchIdentity, putConnection, redirectUrlFor, revokeTokens, seal, squareIsDemo, type SquareIdentity,
} from '../../../../utils/admin/squareAuth'

/** Square sends the browser back here with ?code&state (or ?error). */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const session = await anonymousSession(event)
  const { oauthState: expected, oauthNext, oauthIntent } = session.data
  await session.update({ oauthState: undefined, oauthNext: undefined, oauthIntent: undefined })
  const intent = oauthIntent === 'connect' ? 'connect' : 'signin'
  const next = oauthNext || (intent === 'connect' ? '/admin/square' : '/admin')
  const fail = (code: string) => sendRedirect(event, `${intent === 'connect' ? '/admin/square' : '/admin/login'}?error=${encodeURIComponent(code)}`, 302)

  if (typeof q.error === 'string') return fail(q.error === 'access_denied' ? 'denied' : 'square')
  if (!expected || q.state !== expected) return fail('state')

  // --- Demo: SAMPLE identity, memory store, no network ----------------------
  if (squareIsDemo()) {
    if (q.demo !== '1' || intent !== 'connect' || !(await getOwnerSession(event))) return fail('state')
    await putConnection({ sealed: '', expiresAt: '', ...sample(DEMO_IDENTITY), connectedAt: nowIso(), source: 'demo' })
    await logActivity({ kind: 'square', entity: 'square', entityId: DEMO_IDENTITY.merchantId, summary: 'Demo: SAMPLE Square account connected' })
    return sendRedirect(event, `${next}${next.includes('?') ? '&' : '?'}connected=1`, 302)
  }

  // --- Real Square ----------------------------------------------------------
  if (typeof q.code !== 'string' || !q.code) return fail('square')
  let identity: SquareIdentity
  let tokens: Awaited<ReturnType<typeof exchangeCode>>
  try {
    tokens = await exchangeCode(q.code, redirectUrlFor(event))
    identity = await fetchIdentity(tokens.accessToken, tokens.merchantId)
  } catch (error) {
    console.error('[square oauth]', error instanceof Error ? error.message : error)
    return fail('square')
  }

  const owner = await getOwner()
  const signedIn = intent === 'connect' && !!(await getOwnerSession(event))
  if (intent === 'connect' && !signedIn) return fail('signedout')
  const check = checkSquareAccess(owner, identity, intent)
  if (!check.ok || !owner) {
    // Do not keep access we are not going to use.
    await revokeTokens(tokens.accessToken)
    return fail(check.ok ? 'noowner' : check.code)
  }

  await putConnection({
    sealed: seal({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
    expiresAt: tokens.expiresAt,
    ...sample(identity),
    connectedAt: nowIso(),
    source: 'square',
  })
  if (!owner.merchantId || owner.businessName !== identity.businessName) {
    await putOwner({ ...owner, merchantId: identity.merchantId, businessName: identity.businessName })
  }
  if (intent === 'signin') await signInAsOwner(event, owner, 'square')
  await logActivity({
    kind: 'square',
    entity: 'square',
    entityId: identity.merchantId,
    summary: intent === 'connect' ? `Square connected (${identity.businessName || identity.merchantId})` : 'Signed in with Square',
  })
  return sendRedirect(event, intent === 'connect' ? `${next}${next.includes('?') ? '&' : '?'}connected=1` : next, 302)
})

function sample(i: SquareIdentity) {
  return { merchantId: i.merchantId, businessName: i.businessName, email: i.email, locationId: i.locationId, locationName: i.locationName }
}
