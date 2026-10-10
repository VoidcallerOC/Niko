import { randomBytes } from 'node:crypto'
import { anonymousSession, getOwnerSession } from '../../../../utils/admin/auth'
import { getOwner, linkedMerchant } from '../../../../utils/admin/owner'
import { authorizeUrl, redirectUrlFor, squareAuthConfig, squareIsDemo, squareSetupProblems } from '../../../../utils/admin/squareAuth'

/**
 * Start a Square OAuth round trip.
 *   Signed in  → "connect": link Nino's Square account to the owner account.
 *   Signed out → "signin": only if the owner already linked a Square account.
 * A random state goes into the sealed session cookie and is checked on return.
 * Demo mode skips Square entirely and returns a SAMPLE identity.
 */
export default defineEventHandler(async (event) => {
  const signedIn = !!(await getOwnerSession(event))
  const intent: 'connect' | 'signin' = signedIn ? 'connect' : 'signin'
  const back = (code: string) => sendRedirect(event, `${intent === 'connect' ? '/admin/square' : '/admin/login'}?error=${code}`, 302)

  if (!squareIsDemo()) {
    if (squareSetupProblems().length) return back('notconfigured')
    if (intent === 'signin') {
      const owner = await getOwner()
      if (!linkedMerchant(owner, squareAuthConfig().env)) return back('nosquare')
    }
  } else if (intent === 'signin') {
    return back('nosquare')
  }

  const query = getQuery(event)
  const fallback = intent === 'connect' ? '/admin/square' : '/admin'
  const next = typeof query.next === 'string' && query.next.startsWith('/admin') && !query.next.startsWith('//') ? query.next : fallback
  const state = randomBytes(24).toString('base64url')
  const session = await anonymousSession(event)
  await session.update({ oauthState: state, oauthNext: next, oauthIntent: intent })
  if (squareIsDemo()) return sendRedirect(event, `/api/admin/auth/square/callback?demo=1&state=${encodeURIComponent(state)}`, 302)
  return sendRedirect(event, authorizeUrl(state, redirectUrlFor(event)), 302)
})
