import { isDemo } from './auth'
import { listProducts, listEvents, nowIso, putEvent, putProduct, putSettings, getSettings, logActivity } from './store'
import type { Product, StoreEvent } from './types'
import { emptyProduct } from './types'

/**
 * Demo mode only (NUXT_ADMIN_DEMO=1). Every record is prefixed "SAMPLE" and
 * carries source: 'demo'. None of it is Nino's inventory, pricing or schedule.
 * Outside demo mode the store starts empty and nothing is seeded.
 */
let seeded = false

const sample = (over: Partial<Product>): Product => {
  const now = nowIso()
  return { ...emptyProduct(now), source: 'demo', ...over, id: over.id ?? '', notes: 'SAMPLE record from demo mode.' }
}

export async function ensureDemoSeed() {
  if (!isDemo() || seeded) return
  seeded = true
  const existing = await listProducts()
  if (existing.length) return
  const products: Product[] = [
    sample({ id: 'demo000000000001', title: 'SAMPLE Charizard ex', game: 'Pokémon', set: 'Obsidian Flames', cardNumber: '125/197', rarity: 'Double Rare', condition: 'Near Mint', priceCents: 4500, quantity: 1, availability: 'listed', photos: [{ id: 'ig-robin', src: '/media/ig/onepiece-beauties-b-600.webp', alt: 'SAMPLE photo (placeholder from the site feed)' }] }),
    sample({ id: 'demo000000000002', title: 'SAMPLE Monkey.D.Luffy Leader', game: 'One Piece', set: 'OP-05 Awakening of the New Era', cardNumber: 'OP05-060', rarity: 'L', condition: 'Near Mint', priceCents: 1200, quantity: 3, availability: 'listed' }),
    sample({ id: 'demo000000000003', title: 'SAMPLE Nami (Alt Art)', game: 'One Piece', set: 'OP-01 Romance Dawn', cardNumber: 'OP01-016', rarity: 'SR', condition: 'Lightly Played', priceCents: 9000, quantity: 0, availability: 'sold', photos: [{ id: 'ig-nami', src: '/media/ig/onepiece-beauties-a-600.webp', alt: 'SAMPLE photo (placeholder from the site feed)' }] }),
    sample({ id: 'demo000000000004', title: 'SAMPLE Pikachu (unpriced draft)', game: 'Pokémon', set: '', cardNumber: '', rarity: '', condition: '', priceCents: null, quantity: 1, availability: 'draft', source: 'scan' }),
    sample({ id: 'demo000000000005', title: 'SAMPLE Kaido Leader', game: 'One Piece', set: 'OP-01 Romance Dawn', cardNumber: 'OP01-061', rarity: 'L', condition: 'Near Mint', grade: { company: 'PSA', grade: '10', certNumber: '00000000' }, priceCents: 25000, quantity: 1, availability: 'hidden', photos: [{ id: 'ig-kaido', src: '/media/ig/pull-kaido-600.webp', alt: 'SAMPLE photo (placeholder from the site feed)' }] }),
  ]
  for (const p of products) await putProduct(p)
  const now = nowIso()
  const events: StoreEvent[] = [
    { id: 'demoevent0000001', title: 'SAMPLE Card show', date: '2026-11-07', endDate: '2026-11-07', hours: '10am–4pm', venue: 'SAMPLE Community Center', city: 'Hartford', state: 'CT', url: '', notes: 'Demo-only record.', published: true, createdAt: now, updatedAt: now, deletedAt: null },
  ]
  if (!(await listEvents()).length) for (const e of events) await putEvent(e)
  const settings = await getSettings()
  if (!settings.updatedAt) await putSettings({ ...settings, featuredProductIds: ['demo000000000001'], updatedAt: now })
  await logActivity({ kind: 'create', entity: 'product', entityId: null, summary: 'Demo mode seeded SAMPLE records' })
}
