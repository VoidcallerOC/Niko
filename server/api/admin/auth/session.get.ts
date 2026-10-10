import { authConfig, getOwnerSession } from '../../../utils/admin/auth'
import { envSessionSecret } from '../../../utils/admin/runtime'
import { configuredSetupCode, getOwner, linkedMerchant } from '../../../utils/admin/owner'
import { canonicalHost, redirectUrlFor, requestHost, squareAuthConfig, squareEnvSetting, squareSetupProblems } from '../../../utils/admin/squareAuth'
import { storageStatus } from '../../../utils/admin/runtime'

/**
 * Safe to call signed out: tells the login page which steps are open. Only a
 * signed-in owner sees the owner email, Square link and storage details.
 */
export default defineEventHandler(async (event) => {
  const cfg = authConfig()
  const session = await getOwnerSession(event)
  const owner = cfg.mode === 'owner' ? await getOwner().catch(() => null) : null
  const demo = cfg.mode === 'demo'
  const squareReady = !demo && squareSetupProblems().length === 0
  const linked = linkedMerchant(owner, squareAuthConfig().env)
  const setupCode = !!configuredSetupCode()

  let blocked: string | null = null
  if (cfg.mode === 'unconfigured') blocked = cfg.reason ?? 'The admin is not configured.'
  else if (cfg.mode === 'owner' && !owner && !setupCode) blocked = 'Setup is closed until Nick sets NUXT_ADMIN_SETUP_CODE (at least 12 characters) and redeploys.'

  const storage = storageStatus()

  // Configuration checklist for Nick. Shown before the owner account exists
  // (so he can confirm the Preview before sending Nino the link) and to the
  // signed-in owner. Booleans, variable names and this site's own callback
  // URL only; never a value.
  const showCheck = !demo && (!!session || !owner)
  const sq = squareAuthConfig()
  const callbackUrl = redirectUrlFor(event)
  const canonical = canonicalHost()
  const here = requestHost(event)
  const setupCheck = showCheck
    ? {
        items: [
          { key: 'REDIS_URL', ok: storage.backend === 'redis' || storage.backend === 'fs', label: storage.backend === 'redis' ? 'Durable storage: Redis connected' : storage.backend === 'fs' ? 'Storage: local disk (development only)' : 'Durable storage: REDIS_URL not set' },
          { key: 'NUXT_SESSION_SECRET', ok: !!envSessionSecret(), label: envSessionSecret() ? 'Session secret set' : 'NUXT_SESSION_SECRET not set (32+ characters)' },
          { key: 'NUXT_ADMIN_SETUP_CODE', ok: setupCode, label: setupCode ? 'One-time setup code set' : 'NUXT_ADMIN_SETUP_CODE not set (12+ characters)' },
          { key: 'NUXT_SQUARE_ENV', ok: !!squareEnvSetting(), label: squareEnvSetting() ? `Square environment: ${squareEnvSetting()}` : 'NUXT_SQUARE_ENV not set (production or sandbox)' },
          { key: 'NUXT_SQUARE_APP_ID', ok: !!sq.appId, label: sq.appId ? `Square application ID set${sq.appId.startsWith('sandbox-') ? ' (Sandbox ID)' : ''}` : 'NUXT_SQUARE_APP_ID not set' },
          { key: 'NUXT_SQUARE_APP_SECRET', ok: !!sq.appSecret, label: sq.appSecret ? 'Square application secret set' : 'NUXT_SQUARE_APP_SECRET not set' },
          { key: 'NUXT_SQUARE_REDIRECT_URL', ok: !!sq.redirectUrl && (!canonical || canonical === here), label: sq.redirectUrl ? (canonical === here ? 'Square callback URL matches this site' : 'Square callback URL is for a different host than this page') : 'NUXT_SQUARE_REDIRECT_URL not set' },
        ],
        squareProblems: squareSetupProblems(),
        callbackUrl,
      }
    : null

  return {
    setupCheck,
    signedIn: !!session,
    demo,
    blocked,
    methods: {
      setup: cfg.mode === 'owner' && !owner && setupCode,
      password: demo || !!owner,
      square: squareReady && !!linked,
    },
    ...(session
      ? {
          email: session.data.email ?? null,
          via: session.data.via ?? null,
          owner: owner ? { email: owner.email, squareLinked: !!linked, businessName: linked ? owner.businessName : '', createdAt: owner.createdAt } : null,
          storage: { backend: storage.backend, durable: storage.durable, label: storage.label },
          square: { ready: squareReady || demo, problems: demo ? [] : squareSetupProblems() },
        }
      : {}),
  }
})
