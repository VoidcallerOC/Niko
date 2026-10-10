import { isDemo } from '../../../utils/admin/auth'
import { getOwner, putOwner } from '../../../utils/admin/owner'
import { getConnection, removeConnection, revokeTokens, unseal } from '../../../utils/admin/squareAuth'
import { logActivity } from '../../../utils/admin/store'

/**
 * Disconnect Square: revoke this app's access at Square, delete the sealed
 * tokens, and unlink the merchant from the owner account (so Sign in with
 * Square stops working until he connects again). Cards keep their Square ids.
 */
export default defineEventHandler(async () => {
  const conn = await getConnection()
  let revoked: boolean | null = null
  if (conn?.source === 'square' && conn.sealed && !isDemo()) {
    try {
      revoked = await revokeTokens(unseal(conn.sealed).accessToken)
    } catch {
      revoked = false
    }
  }
  await removeConnection()
  const owner = isDemo() ? null : await getOwner()
  if (owner?.merchantId) await putOwner({ ...owner, merchantId: '', businessName: '' })
  await logActivity({ kind: 'square', entity: 'square', entityId: null, summary: revoked === false ? 'Square disconnected here (Square did not confirm the revoke)' : 'Square disconnected' })
  return { ok: true, revoked }
})
