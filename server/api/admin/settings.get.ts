import { getSettings, listProducts } from '../../utils/admin/store'
import { ensureDemoSeed } from '../../utils/admin/demo'

export default defineEventHandler(async () => {
  await ensureDemoSeed()
  const settings = await getSettings()
  const listed = (await listProducts()).filter((p) => !p.deletedAt && p.availability === 'listed')
  return {
    settings,
    listed: listed.map((p) => ({ id: p.id, title: p.title, photo: p.photos[0]?.src ?? null })),
  }
})
