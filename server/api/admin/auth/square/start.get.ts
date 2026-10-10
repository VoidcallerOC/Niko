import { randomBytes } from 'node:crypto'
import { anonymousSession } from '../../../../utils/admin/auth'
import { authorizeUrl, redirectUrlFor, squareLoginAvailable, squareLoginIsDemo } from '../../../../utils/admin/squareAuth'

/**
 * Begin "Sign in with Square". Stores a random state in the sealed session
 * cookie and sends the browser to Square. In demo mode (no Square app
 * configured) it goes straight to the callback with a labelled sample identity.
 */
export default defineEventHandler(async (event) => {
  if (!squareLoginAvailable()) throw createError({ statusCode: 503, statusMessage: 'Square sign-in is not configured (NUXT_SQUARE_APP_ID / NUXT_SQUARE_APP_SECRET).' })
  const query = getQuery(event)
  const next = typeof query.next === 'string' && query.next.startsWith('/admin') ? query.next : '/admin'
  const state = randomBytes(24).toString('base64url')
  const session = await anonymousSession(event)
  await session.update({ oauthState: state, oauthNext: next })
  if (squareLoginIsDemo()) return sendRedirect(event, `/api/admin/auth/square/callback?demo=1&state=${encodeURIComponent(state)}`, 302)
  return sendRedirect(event, authorizeUrl(state, redirectUrlFor(event)), 302)
})
