<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface IgData {
  status: { source: string; importedAt: string; liveSync: boolean; lastSyncAttempt: string | null; lastSyncError: string | null }
  posts: Array<{ id: string; src: string; alt: string; postUrl: string; postDate: string; caption: string; hidden: boolean; featured: boolean }>
}
const { call } = useAdminApi()
const toast = useAdminToast()
const { data, refresh } = await useAsyncData('admin-instagram', () => useRequestFetch()<IgData>('/api/admin/instagram'))

async function set(id: string, patch: { hidden?: boolean; featured?: boolean }) {
  const res = await call('/api/admin/instagram', { method: 'PUT', body: { id, ...patch } })
  if (res) {
    toast.saved(patch.hidden !== undefined ? (patch.hidden ? 'Hidden from the site' : 'Shown again') : patch.featured ? 'Featured' : 'Unfeatured')
    await refresh()
    await refreshNuxtData('site')
  }
}
</script>

<template>
  <div>
    <AdminPageHead title="Instagram" intro="Which imported posts show on the site, and which lead the feed section." />

    <AdminPanel title="Sync status">
      <dl class="grid gap-3 text-sm sm:grid-cols-3">
        <div><dt class="text-white/60">Source</dt><dd class="font-semibold">Manual import of public posts</dd></div>
        <div><dt class="text-white/60">Last update</dt><dd class="font-semibold">{{ data?.status.importedAt }}</dd></div>
        <div><dt class="text-white/60">Live sync</dt><dd class="font-semibold text-nc-red-bright">Not set up</dd></div>
      </dl>
      <p class="mt-3 text-sm text-nc-mist">
        The feed does not update on its own. New posts need another import. Connecting a live feed requires the Instagram Graph API with a server-side token on an app Nino approves; this admin never asks for the Instagram password and stores no login cookies.
      </p>
    </AdminPanel>

    <ul role="list" class="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <li v-for="p in data?.posts ?? []" :key="p.id" class="overflow-hidden rounded-lg border bg-nc-coal/80" :class="p.hidden ? 'border-nc-rule opacity-60' : p.featured ? 'border-nc-red' : 'border-nc-rule'">
        <div class="relative">
          <img :src="p.src" :alt="p.alt" class="aspect-square w-full object-cover" loading="lazy">
          <span v-if="p.featured" class="absolute top-2 left-2 rounded-sm bg-nc-red px-1.5 py-0.5 text-[0.6875rem] font-bold text-white uppercase">Featured</span>
          <span v-if="p.hidden" class="absolute top-2 right-2 rounded-sm bg-nc-ink/85 px-1.5 py-0.5 text-[0.6875rem] font-bold text-white uppercase">Hidden</span>
        </div>
        <div class="p-3">
          <p class="line-clamp-2 text-sm">{{ p.caption }}</p>
          <p class="mt-1 text-xs text-white/50">{{ formatPostDate(p.postDate) }} · <a :href="p.postUrl" target="_blank" rel="noopener noreferrer" class="underline">Open post</a></p>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <AdminButton size="sm" :variant="p.featured ? 'white' : 'outline'" :disabled="p.hidden" @click="set(p.id, { featured: !p.featured })">{{ p.featured ? 'Unfeature' : 'Feature' }}</AdminButton>
            <AdminButton size="sm" variant="outline" @click="set(p.id, { hidden: !p.hidden })">{{ p.hidden ? 'Show' : 'Hide' }}</AdminButton>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
