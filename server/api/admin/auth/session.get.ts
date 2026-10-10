import { authConfig, getOwnerSession } from '../../../utils/admin/auth'
import { getOwnerBinding, squareLoginAvailable, squareLoginIsDemo } from '../../../utils/admin/squareAuth'

/** Safe to call signed-out: tells the login page which sign-in methods exist. */
export default defineEventHandler(async (event) => {
  const cfg = authConfig()
  const session = await getOwnerSession(event)
  const binding = await getOwnerBinding().catch(() => null)
  const square = squareLoginAvailable() && !!cfg.secret
  const password = cfg.mode === 'demo' || cfg.mode === 'password' || !!binding?.passwordHash
  const setup = cfg.mode === 'owner' && !binding
  return {
    signedIn: !!session,
    mode: cfg.mode,
    reason: cfg.mode === 'unconfigured' ? cfg.reason ?? null : null,
    demo: cfg.mode === 'demo',
    signedInAt: session?.data.signedInAt ?? null,
    via: session?.data.via ?? null,
    email: session?.data.email ?? null,
    methods: {
      password,
      /** Password sign-in asks for the owner email as well. */
      emailRequired: !!binding?.passwordHash,
      square,
      squareDemo: square && squareLoginIsDemo(),
      setup,
      setupCodeRequired: setup && !!String(useRuntimeConfig().adminSetupCode || ''),
    },
    owner: binding
      ? { bound: true, email: binding.email, businessName: binding.businessName, boundAt: binding.boundAt, source: binding.source, hasPassword: !!binding.passwordHash, squareLinked: !!binding.merchantId }
      : { bound: false },
  }
})
