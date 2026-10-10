import { authConfig, getOwnerSession } from '../../../utils/admin/auth'

/** Safe to call signed-out: tells the login page which mode the server is in. */
export default defineEventHandler(async (event) => {
  const cfg = authConfig()
  const session = await getOwnerSession(event)
  return {
    signedIn: !!session,
    mode: cfg.mode,
    reason: cfg.mode === 'unconfigured' ? cfg.reason ?? null : null,
    demo: cfg.mode === 'demo',
    signedInAt: session?.data.signedInAt ?? null,
  }
})
