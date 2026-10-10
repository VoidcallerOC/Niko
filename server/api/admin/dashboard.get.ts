import { getSettings, listEvents, listProducts, recentActivity, getSquareState } from '../../utils/admin/store'
import { isLowStock } from '../../utils/admin/products'
import { ensureDemoSeed } from '../../utils/admin/demo'
import { authConfig } from '../../utils/admin/auth'
import { squareStatus } from '../../utils/admin/square'
import { INSTAGRAM_IMPORT } from '../../utils/admin/instagram'

export default defineEventHandler(async () => {
  await ensureDemoSeed()
  const [products, events, settings, activity, square, sq] = await Promise.all([listProducts(), listEvents(), getSettings(), recentActivity(12), getSquareState(), squareStatus()])
  const live = products.filter((p) => !p.deletedAt)
  const today = new Date().toISOString().slice(0, 10)
  return {
    demo: authConfig().mode === 'demo',
    counts: {
      listed: live.filter((p) => p.availability === 'listed').length,
      drafts: live.filter((p) => p.availability === 'draft').length,
      hidden: live.filter((p) => p.availability === 'hidden').length,
      sold: live.filter((p) => p.availability === 'sold').length,
      lowStock: live.filter((p) => isLowStock(p, settings)).length,
      trash: products.filter((p) => p.deletedAt).length,
      upcomingEvents: events.filter((e) => !e.deletedAt && e.endDate >= today).length,
    },
    lowStock: live.filter((p) => isLowStock(p, settings)).slice(0, 6).map((p) => ({ id: p.id, title: p.title, quantity: p.quantity })),
    activity,
    integrations: {
      square: { configured: sq.configured, demo: sq.demo, businessName: sq.connection?.businessName ?? '', lastApplyAt: square.lastApplyAt, lastError: square.lastError },
      instagram: { source: INSTAGRAM_IMPORT.source, importedAt: INSTAGRAM_IMPORT.importedAt, liveSync: INSTAGRAM_IMPORT.liveSync },
    },
  }
})
