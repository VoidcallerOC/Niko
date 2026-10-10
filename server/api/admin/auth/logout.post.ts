import { signOut } from '../../../utils/admin/auth'

export default defineEventHandler(async (event) => {
  await signOut(event)
  return { ok: true }
})
