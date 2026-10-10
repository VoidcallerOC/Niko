<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Dashboard {
  demo: boolean
  counts: { listed: number; drafts: number; hidden: number; sold: number; lowStock: number; trash: number; upcomingEvents: number }
  lowStock: Array<{ id: string; title: string; quantity: number }>
  activity: Array<{ id: string; at: string; kind: string; entity: string; entityId: string | null; summary: string }>
  integrations: { square: { configured: boolean; demo: boolean; businessName: string; lastApplyAt: string | null; lastError: string | null }; instagram: { source: string; importedAt: string; liveSync: boolean } }
}
const { data, error } = await useAsyncData('admin-dashboard', () => useRequestFetch()<Dashboard>('/api/admin/dashboard'))
const { data: who } = await useAdminSession()

const tiles = computed(() => {
  const c = data.value?.counts
  if (!c) return []
  return [
    { label: 'Listed', value: c.listed, to: '/admin/inventory?filter=listed', note: 'on the site now' },
    { label: 'Drafts', value: c.drafts, to: '/admin/inventory?filter=draft', note: 'not shown yet' },
    { label: 'Low stock', value: c.lowStock, to: '/admin/inventory?filter=low', note: 'listed, running out', warn: c.lowStock > 0 },
    { label: 'Upcoming events', value: c.upcomingEvents, to: '/admin/events', note: 'you added' },
  ]
})
</script>

<template>
  <div>
    <AdminPageHead eyebrow="Show day" title="What do you need?" />

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <AdminButton to="/admin/scan" variant="red" size="lg" block>Scan a card</AdminButton>
      <AdminButton to="/admin/inventory/new" variant="white" size="lg" block>Add a listing</AdminButton>
      <AdminButton to="/admin/inventory?filter=listed" variant="outline" size="lg" block>
        <span class="sm:hidden">Mark sold</span><span class="hidden sm:inline">Change quantity / mark sold</span>
      </AdminButton>
      <AdminButton to="/admin/events" variant="outline" size="lg" block>
        <span class="sm:hidden">Events</span><span class="hidden sm:inline">Update an event</span>
      </AdminButton>
    </div>

    <p v-if="error" class="mt-6 text-nc-red-bright">Couldn’t load the dashboard: {{ errorMessage(error) }}</p>

    <ul v-else role="list" class="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <li v-for="t in tiles" :key="t.label">
        <NuxtLink :to="t.to" class="block rounded-lg border p-4 transition-colors hover:border-nc-red" :class="t.warn ? 'border-nc-red/60 bg-nc-red/10' : 'border-nc-rule bg-nc-coal/80'">
          <span class="text-sm font-semibold text-white/70">{{ t.label }}</span>
          <span class="mt-1 block font-display text-5xl leading-none font-bold">{{ t.value }}</span>
          <span class="mt-1 block text-xs text-white/50">{{ t.note }}</span>
        </NuxtLink>
      </li>
    </ul>

    <div class="mt-8 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
      <AdminPanel title="Low stock" intro="Listed cards at or below your low-stock number.">
        <p v-if="!data?.lowStock.length" class="text-sm text-nc-mist">Nothing is running low.</p>
        <ul v-else role="list" class="divide-y divide-nc-rule">
          <li v-for="p in data.lowStock" :key="p.id">
            <NuxtLink :to="`/admin/inventory/${p.id}`" class="flex min-h-12 items-center justify-between gap-3 hover:text-nc-red-bright">
              <span class="font-semibold">{{ p.title || 'Untitled card' }}</span>
              <span class="text-sm text-white/70">Qty {{ p.quantity }}</span>
            </NuxtLink>
          </li>
        </ul>
      </AdminPanel>

      <AdminPanel title="Recent edits">
        <p v-if="!data?.activity.length" class="text-sm text-nc-mist">No edits yet.</p>
        <ul v-else role="list" class="divide-y divide-nc-rule">
          <li v-for="a in data.activity" :key="a.id" class="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
            <component :is="a.entity === 'product' && a.entityId ? resolveComponent('NuxtLink') : 'span'" :to="a.entity === 'product' && a.entityId ? `/admin/inventory/${a.entityId}` : undefined" class="min-w-0 truncate">{{ a.summary }}</component>
            <time :datetime="a.at" class="shrink-0 text-white/50">{{ timeAgo(a.at) }}</time>
          </li>
        </ul>
      </AdminPanel>
    </div>

    <AdminPanel class="mt-5" title="Connections">
      <dl class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-md bg-nc-char p-3" data-storage>
          <dt class="text-sm font-semibold">Storage</dt>
          <dd class="mt-1 text-sm text-nc-mist">
            {{ who?.storage?.label }}.
            <template v-if="who?.storage?.backend === 'redis'"> Inventory, photos and your account survive restarts and redeploys.</template>
            <template v-else-if="who?.storage?.backend === 'fs'"> Fine for trying it on a computer; Vercel needs Redis.</template>
            <template v-else-if="who?.storage?.backend === 'demo'"> Nothing here is saved.</template>
          </dd>
        </div>
        <div class="rounded-md bg-nc-char p-3">
          <dt class="text-sm font-semibold">Square</dt>
          <dd class="mt-1 text-sm text-nc-mist">
            <template v-if="data?.integrations.square.demo">Demo: a SAMPLE catalog stands in for Square. No real account is contacted.</template>
            <template v-else-if="data?.integrations.square.configured">Connected<template v-if="data.integrations.square.businessName"> as {{ data.integrations.square.businessName }}</template>. Last applied sync: {{ data.integrations.square.lastApplyAt ? timeAgo(data.integrations.square.lastApplyAt) : 'never' }}.</template>
            <template v-else>Not connected. The admin works without it.</template>
            <span v-if="data?.integrations.square.lastError" class="block text-nc-red-bright">Last error: {{ data.integrations.square.lastError }}</span>
            <NuxtLink to="/admin/square" class="ml-1 underline">Square page</NuxtLink>
          </dd>
        </div>
        <div class="rounded-md bg-nc-char p-3">
          <dt class="text-sm font-semibold">Instagram</dt>
          <dd class="mt-1 text-sm text-nc-mist">
            Manual import from {{ data?.integrations.instagram.importedAt }}. No live sync is set up, so the site feed does not update by itself.
            <NuxtLink to="/admin/instagram" class="ml-1 underline">Manage posts</NuxtLink>
          </dd>
        </div>
      </dl>
    </AdminPanel>
  </div>
</template>
