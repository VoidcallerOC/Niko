import { assertSameOrigin, getOwnerSession } from '../utils/admin/auth'

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
