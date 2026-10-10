import { assertSameOrigin, getOwnerSession } from '../utils/admin/auth'
import { ensureSessionSecret } from '../utils/admin/runtime'

/**
 * Server-side gate for everything under /admin and /api/admin.
 *
 * - /api/admin/*: no session → 401 JSON (except the auth endpoints).
 * - /admin/*: no session → 302 to /admin/login. The page middleware in
 *   app/middleware/admin.ts handles client-side navigation; this one makes a
 *   direct URL hit fail on the server before any page HTML is rendered.
 * - All admin responses are no-store and noindex.
 */
const PUBLIC_API = new Set(['/api/admin/auth/login', '/api/admin/auth/session', '/api/admin/auth/logout', '/api/admin/auth/setup', '/api/admin/auth/square/start', '/api/admin/auth/square/callback'])

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] ?? ''
  const isApi = path === '/api/admin' || path.startsWith('/api/admin/')
  const isPage = path === '/admin' || path.startsWith('/admin/')
  if (!isApi && !isPage) return

  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')

  // Load (or create) the session secret before anything reads a cookie.
  try {
    await ensureSessionSecret()
  } catch (error) {
    console.error('[admin] session secret unavailable:', error instanceof Error ? error.message : error)
    throw createError({ statusCode: 503, statusMessage: 'Admin storage is unreachable. Try again shortly.' })
  }

  if (isApi) {
    assertSameOrigin(event)
    if (PUBLIC_API.has(path)) return
    const session = await getOwnerSession(event)
    if (!session) throw createError({ statusCode: 401, statusMessage: 'Sign in required' })
    return
  }

  if (path === '/admin/login') return
  // Only HTML navigations: Nuxt's own asset/payload requests live elsewhere.
  const session = await getOwnerSession(event)
  if (!session) {
    const next = encodeURIComponent(event.path)
    return sendRedirect(event, `/admin/login?next=${next}`, 302)
  }
})
