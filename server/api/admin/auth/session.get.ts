import { authConfig, getOwnerSession } from '../../../utils/admin/auth'
import { configuredSetupCode, getOwner } from '../../../utils/admin/owner'
import { squareSetupProblems } from '../../../utils/admin/squareAuth'
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
  const setupCode = !!configuredSetupCode()

  let blocked: string | null = null
  if (cfg.mode === 'unconfigured') blocked = cfg.reason ?? 'The admin is not configured.'
  else if (cfg.mode === 'owner' && !owner && !setupCode) blocked = 'Setup is closed until Nick sets NUXT_ADMIN_SETUP_CODE (at least 12 characters) and redeploys.'

  const storage = storageStatus()
  return {
    signedIn: !!session,
    demo,
    blocked,
    methods: {
      setup: cfg.mode === 'owner' && !owner && setupCode,
      password: demo || !!owner,
      square: squareReady && !!owner?.merchantId,
    },
    ...(session
      ? {
          email: session.data.email ?? null,
          via: session.data.via ?? null,
          owner: owner ? { email: owner.email, squareLinked: !!owner.merchantId, businessName: owner.businessName, createdAt: owner.createdAt } : null,
          storage: { backend: storage.backend, durable: storage.durable, label: storage.label },
          square: { ready: squareReady || demo, problems: demo ? [] : squareSetupProblems() },
        }
      : {}),
  }
})
