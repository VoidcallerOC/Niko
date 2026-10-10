/**
 * Client-side companion to server/middleware/admin-guard.ts. The server
 * already redirects direct hits; this keeps in-app navigation honest after a
 * session expires. It asks the server, never a local flag.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin/login') return
  const fetcher = useRequestFetch()
  try {
    const session = await fetcher<{ signedIn: boolean }>('/api/admin/auth/session')
    if (!session.signedIn) return navigateTo({ path: '/admin/login', query: { next: to.fullPath } })
  } catch {
    return navigateTo({ path: '/admin/login', query: { next: to.fullPath } })
  }
})
