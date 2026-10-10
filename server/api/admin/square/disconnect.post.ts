import { getConnection, removeConnection, revokeTokens, unseal } from '../../../utils/admin/squareAuth'
import { logActivity } from '../../../utils/admin/store'

/** Drop the stored Square tokens (and revoke them at Square). The owner binding stays. */
export default defineEventHandler(async () => {
  const conn = await getConnection()
  if (conn && conn.source === 'square') {
    try {
      await revokeTokens(unseal(conn.sealed).accessToken)
    } catch {
      // Already unusable; drop it anyway.
    }
  }
  await removeConnection()
  await logActivity({ kind: 'square', entity: 'square', entityId: null, summary: 'Square disconnected' })
  return { ok: true }
})
