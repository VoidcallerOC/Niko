import { signIn, authConfig } from '../../../utils/admin/auth'
import { getOwnerBinding } from '../../../utils/admin/squareAuth'
import { ensureDemoSeed } from '../../../utils/admin/demo'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown; password?: unknown }>(event).catch((): { email?: unknown; password?: unknown } => ({}))
  const password = typeof body?.password === 'string' ? body.password : ''
  const email = typeof body?.email === 'string' ? body.email : ''
  if (!password) throw createError({ statusCode: 400, statusMessage: 'Enter the password.' })
  const owner = await getOwnerBinding().catch(() => null)
  await signIn(event, email, password, owner ? { email: owner.email, passwordHash: owner.passwordHash } : null)
  await ensureDemoSeed()
  return { ok: true, demo: authConfig().mode === 'demo' }
})
