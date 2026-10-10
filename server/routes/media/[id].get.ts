import { getUploadBytes, getUploadMeta } from '../../utils/admin/store'

/** Uploaded product photos. Public once a card is listed, so no auth here. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^[a-f0-9]{16}$/.test(id)) throw createError({ statusCode: 404 })
  const meta = await getUploadMeta(id)
  const bytes = meta ? await getUploadBytes(id) : null
  if (!meta || !bytes) throw createError({ statusCode: 404 })
  setHeader(event, 'Content-Type', meta.type)
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return bytes
})
