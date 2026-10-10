import { listEvents } from '../../../utils/admin/store'
import { loadTreasureShows } from '../../../utils/treasureShows'
import { ensureDemoSeed } from '../../../utils/admin/demo'

/** Manual events plus a read-only view of what OnTreasure currently lists. */
export default defineEventHandler(async () => {
  await ensureDemoSeed()
  const events = (await listEvents()).sort((a, b) => (a.date < b.date ? -1 : 1))
  const fixture = process.env.NUXT_TREASURE_SHOWS_FIXTURE
  const treasure = fixture
    ? await import('node:fs/promises').then((fs) => fs.readFile(fixture, 'utf8')).then((t) => JSON.parse(t) as Awaited<ReturnType<typeof loadTreasureShows>>)
    : await loadTreasureShows()
  return { events: events.filter((e) => !e.deletedAt), trash: events.filter((e) => e.deletedAt), treasure }
})
