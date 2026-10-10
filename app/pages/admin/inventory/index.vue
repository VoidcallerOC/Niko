<script setup lang="ts">
import type { Product } from '~~/server/utils/admin/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const { call } = useAdminApi()
const toast = useAdminToast()

type Filter = 'all' | 'listed' | 'draft' | 'hidden' | 'sold' | 'low' | 'trash'
const filters: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'listed', label: 'Listed' },
  { value: 'draft', label: 'Drafts' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'low', label: 'Low stock' },
  { value: 'sold', label: 'Sold' },
  { value: 'trash', label: 'Trash' },
]
const filter = computed<Filter>(() => (filters.some((f) => f.value === route.query.filter) ? (route.query.filter as Filter) : 'all'))
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const debounced = ref(q.value)
let timer: number | undefined
watch(q, (v) => {
  if (import.meta.client) {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => (debounced.value = v), 200)
  }
})

const { data, refresh, pending } = await useAsyncData(
  'admin-products',
  () => useRequestFetch()<{ products: Product[]; lowStockThreshold: number }>('/api/admin/products', { query: { filter: filter.value, q: debounced.value } }),
  { watch: [filter, debounced] },
)

const selected = ref(new Set<string>())
const busyIds = ref(new Set<string>())
const setFilter = (f: Filter) => router.replace({ query: { ...route.query, filter: f === 'all' ? undefined : f } })

function withBusy<T>(id: string, fn: () => Promise<T>) {
  busyIds.value = new Set([...busyIds.value, id])
  return fn().finally(() => {
    const next = new Set(busyIds.value)
    next.delete(id)
    busyIds.value = next
  })
}

async function changeQuantity(p: Product, delta: number) {
  const quantity = Math.max(0, p.quantity + delta)
  await withBusy(p.id, async () => {
    const res = await call<{ product: Product }>(`/api/admin/products/${p.id}`, { method: 'PUT', body: { quantity } })
    if (res) {
      toast.saved(`Qty ${res.product.quantity}`)
      await refresh()
    }
  })
}
async function setAvailability(p: Product, availability: Product['availability']) {
  await withBusy(p.id, async () => {
    const body: Record<string, unknown> = { availability }
    if (availability === 'sold' && p.quantity > 0) body.quantity = p.quantity - 1
    const res = await call<{ product: Product }>(`/api/admin/products/${p.id}`, { method: 'PUT', body })
    if (res) {
      toast.saved(availability === 'sold' ? 'Marked sold' : availability === 'hidden' ? 'Hidden from the site' : 'Listed on the site')
      await refresh()
    }
  })
}
async function restore(p: Product) {
  await withBusy(p.id, async () => {
    const res = await call(`/api/admin/products/${p.id}/restore`)
    if (res) {
      toast.saved('Restored')
      await refresh()
    }
  })
}

// Bulk changes: pick an action, confirm with the count, then apply.
const bulkAction = ref<'' | 'listed' | 'hidden' | 'sold' | 'trash' | 'restore'>('')
const bulkBusy = ref(false)
const bulkLabels = { listed: 'List', hidden: 'Hide', sold: 'Mark sold', trash: 'Move to trash', restore: 'Restore' } as const
const bulkOptions = computed(() => (filter.value === 'trash' ? (['restore'] as const) : (['listed', 'hidden', 'sold', 'trash'] as const)))
function toggle(id: string, on: boolean) {
  const next = new Set(selected.value)
  on ? next.add(id) : next.delete(id)
  selected.value = next
}
async function runBulk() {
  if (!bulkAction.value) return
  bulkBusy.value = true
  try {
    const res = await call<{ changed: number; skipped: number }>('/api/admin/products/bulk', { body: { ids: [...selected.value], action: bulkAction.value, confirm: true } })
    if (res) {
      toast.saved(`${res.changed} updated${res.skipped ? `, ${res.skipped} skipped` : ''}`)
      selected.value = new Set()
      await refresh()
    }
  } finally {
    bulkBusy.value = false
    bulkAction.value = ''
  }
}
</script>

<template>
  <div>
    <AdminPageHead title="Inventory" :intro="filter === 'trash' ? 'Cards in the trash can be restored. Nothing is deleted for good from here.' : undefined">
      <AdminButton to="/admin/scan" variant="outline">Scan</AdminButton>
      <AdminButton to="/admin/inventory/new" variant="red">Add card</AdminButton>
    </AdminPageHead>

    <div class="grid gap-3">
      <label class="relative block">
        <span class="sr-only">Search cards</span>
        <input v-model="q" type="search" placeholder="Search title, set, number, grade…" class="min-h-12 w-full rounded-md border border-white/20 bg-nc-char pr-3 pl-10 text-base text-white placeholder:text-white/35 focus:border-nc-red focus:outline-none">
        <svg aria-hidden="true" viewBox="0 0 24 24" class="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-white/50" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      </label>
      <div class="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div class="flex gap-2 whitespace-nowrap" role="group" aria-label="Filter">
          <button v-for="f in filters" :key="f.value" type="button" class="min-h-11 rounded-full px-4 text-sm font-semibold transition-colors" :class="filter === f.value ? 'bg-white text-nc-ink' : 'bg-white/10 text-white/80 hover:bg-white/15'" :aria-pressed="filter === f.value" @click="setFilter(f.value)">{{ f.label }}</button>
        </div>
      </div>
    </div>

    <div v-if="selected.size" class="sticky top-[6.25rem] z-30 mt-4 flex flex-wrap items-center gap-2 rounded-md border border-nc-red/60 bg-nc-ink/95 p-3 backdrop-blur">
      <span class="text-sm font-semibold">{{ selected.size }} selected</span>
      <div class="ml-auto flex flex-wrap gap-2">
        <AdminButton v-for="a in bulkOptions" :key="a" size="sm" :variant="a === 'trash' ? 'danger' : 'outline'" @click="bulkAction = a">{{ bulkLabels[a] }}</AdminButton>
        <AdminButton size="sm" variant="quiet" @click="selected = new Set()">Clear</AdminButton>
      </div>
    </div>

    <p v-if="pending && !data" class="mt-6 text-nc-mist">Loading…</p>
    <div v-else-if="!data?.products.length" class="mt-6 rounded-lg border border-dashed border-nc-rule p-8 text-center">
      <p class="font-display text-2xl font-bold">{{ q ? 'No cards match' : filter === 'all' ? 'No cards yet' : 'Nothing here' }}</p>
      <p class="mt-2 text-sm text-nc-mist">{{ q ? 'Try fewer words.' : filter === 'all' ? 'Scan a card or add one by hand. There is no built-in catalog.' : 'Cards show up here as their status changes.' }}</p>
      <AdminButton v-if="!q && filter === 'all'" to="/admin/inventory/new" variant="red" class="mt-5">Add the first card</AdminButton>
    </div>
    <ul v-else role="list" class="mt-4 grid gap-3">
      <AdminProductRow
        v-for="p in data.products"
        :key="p.id"
        :product="p"
        :selected="selected.has(p.id)"
        :low-stock-threshold="data.lowStockThreshold"
        :busy="busyIds.has(p.id)"
        @select="toggle(p.id, $event)"
        @quantity="changeQuantity(p, $event)"
        @availability="setAvailability(p, $event)"
        @restore="restore(p)"
      />
    </ul>

    <AdminConfirm :open="!!bulkAction" :title="`${bulkAction ? bulkLabels[bulkAction] : ''} ${selected.size} card${selected.size === 1 ? '' : 's'}?`" :confirm-label="bulkAction ? bulkLabels[bulkAction] : ''" :danger="bulkAction === 'trash'" :busy="bulkBusy" @confirm="runBulk" @cancel="bulkAction = ''">
      <p v-if="bulkAction === 'trash'">They move to Trash and can be restored later.</p>
      <p v-else-if="bulkAction === 'listed'">Cards without a title and price are skipped; nothing is priced for you.</p>
      <p v-else>Each card keeps its previous version, so this can be undone card by card.</p>
    </AdminConfirm>
  </div>
</template>
