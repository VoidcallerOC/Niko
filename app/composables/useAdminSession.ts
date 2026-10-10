/** Shape of /api/admin/auth/session. Owner details appear only when signed in. */
export interface AdminSessionInfo {
  signedIn: boolean
  demo: boolean
  /** Why nobody can sign in or set up right now (missing storage or setup code). */
  blocked: string | null
  methods: { setup: boolean; password: boolean; square: boolean }
  email?: string | null
  via?: 'password' | 'square' | null
  owner?: { email: string; squareLinked: boolean; businessName: string; createdAt: string } | null
  storage?: { backend: 'demo' | 'redis' | 'fs' | 'none'; durable: boolean; label: string }
  square?: { ready: boolean; problems: string[] }
}

export function useAdminSession() {
  return useAsyncData('admin-session', () => useRequestFetch()<AdminSessionInfo>('/api/admin/auth/session'))
}
