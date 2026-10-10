import { signIn, authConfig } from '../../../utils/admin/auth'
import { ensureDemoSeed } from '../../../utils/admin/demo'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: unknown }>(event).catch((): { password?: unknown } => ({}))
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!password) throw createError({ statusCode: 400, statusMessage: 'Enter the password.' })
  await signIn(event, password)
  await ensureDemoSeed()
  return { ok: true, demo: authConfig().mode === 'demo' }
})
