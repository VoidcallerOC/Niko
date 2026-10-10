import { newId, nowIso, putUpload } from '../../utils/admin/store'

/**
 * Photo upload. Mirrors the limits in Infinite Heroes' media upload route
 * (allowed image types, size cap) without the Vercel Blob dependency: bytes
 * go to the admin storage mount and are served from /media/:id.
 */
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])
// The admin resizes photos in the browser first (~200–500 KB); this cap only
// stops oversized files from filling the durable store.
const MAX_BYTES = 4 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file' && p.data?.length)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Choose a photo.' })
  const type = sniffType(file.data) ?? file.type ?? ''
  if (!ALLOWED.has(type)) throw createError({ statusCode: 415, statusMessage: 'Use a JPEG, PNG or WebP photo.' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Photos must be under 4 MB.' })
  const id = newId()
  await putUpload(id, { id, type, size: file.data.length, createdAt: nowIso() }, file.data)
  return { id, src: `/media/${id}`, type, size: file.data.length }
})

function sniffType(bytes: Buffer): string | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (bytes.length > 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}
