<script setup lang="ts">
import type { SyncPreview } from '~~/server/utils/admin/square'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Status {
  configured: boolean
  demo: boolean
  env: string
  hasLocation: boolean
  note: string
  state: { lastPreviewAt: string | null; lastApplyAt: string | null; lastError: string | null }
}
const { call } = useAdminApi()
const toast = useAdminToast()
const { data: status, refresh: refreshStatus } = await useAsyncData('admin-square', () => useRequestFetch()<Status>('/api/admin/square/status'))

const preview = ref<SyncPreview | null>(null)
const busy = ref(false)
const confirmOpen = ref(false)
const imports = ref(new Set<string>())
const pushes = ref(new Set<string>())
const winners = ref<Record<string, 'local' | 'square'>>({})
const remember = ref<Record<string, boolean>>({})
const key = (c: { productId: string; field: string }) => `${c.productId}:${c.field}`
const fieldLabel: Record<string, string> = { title: 'Title', description: 'Description', priceCents: 'Price', quantity: 'Quantity' }
const show = (field: string, v: string | number | null) => (v === null || v === '' ? '—' : field === 'priceCents' ? formatCents(Number(v)) : String(v))

async function runPreview() {
  busy.value = true
  try {
    const res = await call<SyncPreview>('/api/admin/square/preview')
    if (res) {
      preview.value = res
      imports.value = new Set()
      pushes.value = new Set()
      winners.value = Object.fromEntries(res.conflicts.map((c) => [key(c), c.owner]))
      remember.value = {}
    }
  } finally {
    busy.value = false
    await refreshStatus()
  }
}
const planSize = computed(() => imports.value.size + pushes.value.size + (preview.value?.conflicts.length ?? 0))
function toggle(which: 'imports' | 'pushes', id: string) {
  const target = which === 'imports' ? imports : pushes
  const next = new Set(target.value)
  next.has(id) ? next.delete(id) : next.add(id)
  target.value = next
}
async function apply() {
  if (!preview.value) return
  busy.value = true
  try {
    const res = await call<{ imported: number; resolved: number; pushed: number; skipped: string[] }>('/api/admin/square/apply', {
      body: {
        imports: [...imports.value],
        pushes: [...pushes.value],
        resolutions: preview.value.conflicts.map((c) => ({ productId: c.productId, field: c.field, winner: winners.value[key(c)] ?? c.owner, remember: !!remember.value[key(c)] })),
        confirm: true,
      },
    })
    confirmOpen.value = false
    if (res) {
      toast.saved(`Square: ${res.imported} imported, ${res.resolved} resolved, ${res.pushed} pushed${res.skipped.length ? `, ${res.skipped.length} skipped` : ''}`)
      if (res.skipped.length) toast.push('info', res.skipped.join(' · '), 8000)
      preview.value = null
      await refreshStatus()
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHead title="Square" intro="Optional. Pull Square items in as drafts, push listings out, and settle differences field by field. Every sync is previewed first and never deletes anything on either side." />

    <AdminPanel title="Connection">
      <p class="text-sm" :class="status?.configured ? 'text-white' : status?.demo ? 'text-nc-red-bright' : 'text-nc-mist'">{{ status?.note }}</p>
      <dl class="mt-3 grid gap-2 text-xs text-white/60 sm:grid-cols-3">
        <div><dt>Last preview</dt><dd class="text-white">{{ status?.state.lastPreviewAt ? timeAgo(status.state.lastPreviewAt) : 'never' }}</dd></div>
        <div><dt>Last applied</dt><dd class="text-white">{{ status?.state.lastApplyAt ? timeAgo(status.state.lastApplyAt) : 'never' }}</dd></div>
        <div><dt>Last error</dt><dd :class="status?.state.lastError ? 'text-nc-red-bright' : 'text-white'">{{ status?.state.lastError || 'none' }}</dd></div>
      </dl>
      <div class="mt-4">
        <AdminButton variant="white" size="lg" :busy="busy" :disabled="!status?.configured && !status?.demo" @click="runPreview">Preview sync</AdminButton>
      </div>
    </AdminPanel>

    <template v-if="preview">
      <div v-if="preview.source === 'demo'" class="mt-5 rounded-md border border-nc-red/60 bg-nc-red/10 px-4 py-3 text-sm">This preview uses a labelled <strong>SAMPLE</strong> Square catalog. No real Square account was contacted.</div>

      <AdminPanel class="mt-5" title="In Square, not here" intro="Tick the ones to bring in. They arrive as drafts with Square’s name, price and count; nothing is listed automatically.">
        <p v-if="!preview.imports.length" class="text-sm text-nc-mist">Nothing new in Square.</p>
        <ul v-else role="list" class="divide-y divide-nc-rule">
          <li v-for="i in preview.imports" :key="i.squareId">
            <label class="flex min-h-12 cursor-pointer items-center gap-3 py-1">
              <input type="checkbox" class="h-6 w-6 accent-nc-red" :checked="imports.has(i.squareId)" @change="toggle('imports', i.squareId)">
              <span class="min-w-0 flex-1"><span class="font-semibold">{{ i.name }}</span> <span class="text-sm text-white/60">· {{ show('priceCents', i.priceCents) }} · qty {{ i.quantity ?? '—' }}</span></span>
            </label>
          </li>
        </ul>
      </AdminPanel>

      <AdminPanel class="mt-5" title="Differences" intro="Both values are shown. Pick which wins for each field; tick Remember to keep that choice for future syncs.">
        <p v-if="!preview.conflicts.length" class="text-sm text-nc-mist">Linked cards match Square.</p>
        <ul v-else role="list" class="divide-y divide-nc-rule">
          <li v-for="c in preview.conflicts" :key="key(c)" class="py-3">
            <p class="font-semibold">{{ c.title }} <span class="text-white/60">· {{ fieldLabel[c.field] }}</span></p>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button type="button" class="min-h-14 rounded-md px-3 text-left ring-1 ring-inset" :class="winners[key(c)] === 'local' ? 'bg-white text-nc-ink ring-white' : 'ring-white/25'" @click="winners[key(c)] = 'local'">
                <span class="block text-[0.6875rem] font-bold uppercase opacity-70">Here</span><span class="block truncate font-semibold">{{ show(c.field, c.local) }}</span>
              </button>
              <button type="button" class="min-h-14 rounded-md px-3 text-left ring-1 ring-inset" :class="winners[key(c)] === 'square' ? 'bg-white text-nc-ink ring-white' : 'ring-white/25'" @click="winners[key(c)] = 'square'">
                <span class="block text-[0.6875rem] font-bold uppercase opacity-70">Square</span><span class="block truncate font-semibold">{{ show(c.field, c.square) }}</span>
              </button>
            </div>
            <label class="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-white/80"><input v-model="remember[key(c)]" type="checkbox" class="h-5 w-5 accent-nc-red"> Remember: {{ fieldLabel[c.field] }} is owned by {{ winners[key(c)] === 'square' ? 'Square' : 'this admin' }}</label>
          </li>
        </ul>
      </AdminPanel>

      <AdminPanel class="mt-5" title="Push to Square" intro="Listed cards not yet in Square, and linked cards whose local values should win. Only ticked cards are sent; Square items are updated in place, never duplicated.">
        <p v-if="!preview.pushable.length" class="text-sm text-nc-mist">Nothing to push.</p>
        <ul v-else role="list" class="divide-y divide-nc-rule">
          <li v-for="p in preview.pushable" :key="p.productId">
            <label class="flex min-h-12 cursor-pointer items-center gap-3 py-1">
              <input type="checkbox" class="h-6 w-6 accent-nc-red" :checked="pushes.has(p.productId)" @change="toggle('pushes', p.productId)">
              <span class="min-w-0 flex-1"><span class="font-semibold">{{ p.title || 'Untitled' }}</span> <span class="text-sm text-white/60">· {{ p.reason === 'new' ? 'not in Square yet' : 'has differences' }}</span></span>
            </label>
          </li>
        </ul>
      </AdminPanel>

      <div class="mt-5 grid gap-2 sm:flex">
        <AdminButton variant="red" size="lg" :disabled="!planSize" :busy="busy" @click="confirmOpen = true">Apply {{ planSize }} change{{ planSize === 1 ? '' : 's' }}</AdminButton>
        <AdminButton variant="quiet" size="lg" @click="preview = null">Discard preview</AdminButton>
      </div>
    </template>

    <AdminConfirm :open="confirmOpen" title="Apply this sync?" confirm-label="Apply" :busy="busy" @confirm="apply" @cancel="confirmOpen = false">
      <ul class="list-disc pl-5">
        <li>{{ imports.size }} Square item{{ imports.size === 1 ? '' : 's' }} become drafts here</li>
        <li>{{ preview?.conflicts.length ?? 0 }} field difference{{ (preview?.conflicts.length ?? 0) === 1 ? '' : 's' }} settled as chosen</li>
        <li>{{ pushes.size }} card{{ pushes.size === 1 ? '' : 's' }} sent to Square</li>
      </ul>
      <p class="mt-2">Nothing is deleted. Local cards keep their previous version.</p>
    </AdminConfirm>
  </div>
</template>
