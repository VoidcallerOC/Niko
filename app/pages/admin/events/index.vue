<script setup lang="ts">
import type { StoreEvent } from '~~/server/utils/admin/types'
import type { TreasureResult } from '~~/server/utils/treasureShows'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { call } = useAdminApi()
const toast = useAdminToast()
const { data, refresh } = await useAsyncData('admin-events', () => useRequestFetch()<{ events: StoreEvent[]; trash: StoreEvent[]; treasure: TreasureResult }>('/api/admin/events'))

const today = new Date().toISOString().slice(0, 10)
const upcoming = computed(() => (data.value?.events ?? []).filter((e) => e.endDate >= today))
const past = computed(() => (data.value?.events ?? []).filter((e) => e.endDate < today).reverse())

async function setPublished(e: StoreEvent, published: boolean) {
  const res = await call(`/api/admin/events/${e.id}`, { method: 'PUT', body: { published } })
  if (res) {
    toast.saved(published ? 'Shown on the site' : 'Hidden from the site')
    await refresh()
  }
}
async function restore(e: StoreEvent) {
  const res = await call(`/api/admin/events/${e.id}/restore`)
  if (res) {
    toast.saved('Restored')
    await refresh()
  }
}
const where = (e: StoreEvent) => [e.venue, [e.city, e.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
</script>

<template>
  <div>
    <AdminPageHead title="Events" intro="Shows you add here appear on the site next to the ones from your OnTreasure profile. One event at a time; no repeating schedule is assumed.">
      <AdminButton to="/admin/events/new" variant="red">Add event</AdminButton>
    </AdminPageHead>

    <div class="grid gap-5 lg:grid-cols-2">
      <div class="grid content-start gap-5">
        <AdminPanel title="Upcoming (added here)">
          <p v-if="!upcoming.length" class="text-sm text-nc-mist">No upcoming events added. OnTreasure shows still appear on the site on their own.</p>
          <ul v-else role="list" class="divide-y divide-nc-rule">
            <li v-for="e in upcoming" :key="e.id" class="py-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-nc-red-bright">{{ formatDay(e.date) }}<template v-if="e.endDate !== e.date"> – {{ formatDay(e.endDate) }}</template><template v-if="e.hours"> · {{ e.hours }}</template></p>
                  <NuxtLink :to="`/admin/events/${e.id}`" class="font-display text-2xl leading-tight font-bold hover:underline">{{ e.title }}</NuxtLink>
                  <p v-if="where(e)" class="text-sm text-nc-mist">{{ where(e) }}</p>
                  <a v-if="e.url" :href="e.url" target="_blank" rel="noopener noreferrer" class="text-xs text-white/60 underline">{{ e.url.includes('ontreasure.com') ? 'OnTreasure event page' : 'Event link' }}</a>
                </div>
                <span class="shrink-0 rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-wide uppercase" :class="e.published ? 'bg-white text-nc-ink' : 'bg-white/10 text-white/70'">{{ e.published ? 'On site' : 'Hidden' }}</span>
              </div>
              <div class="mt-2 flex gap-2">
                <AdminButton size="sm" :variant="e.published ? 'outline' : 'white'" @click="setPublished(e, !e.published)">{{ e.published ? 'Hide' : 'Show on site' }}</AdminButton>
                <AdminButton size="sm" variant="quiet" :to="`/admin/events/${e.id}`">Edit</AdminButton>
              </div>
            </li>
          </ul>
        </AdminPanel>

        <AdminPanel v-if="past.length" title="Past">
          <ul role="list" class="divide-y divide-nc-rule text-sm">
            <li v-for="e in past" :key="e.id" class="flex min-h-11 items-center justify-between gap-3">
              <span class="truncate"><span class="text-white/60">{{ formatDay(e.date) }}</span> · {{ e.title }}</span>
              <NuxtLink :to="`/admin/events/${e.id}`" class="shrink-0 underline">Edit</NuxtLink>
            </li>
          </ul>
        </AdminPanel>

        <AdminPanel v-if="data?.trash.length" title="Trash">
          <ul role="list" class="divide-y divide-nc-rule text-sm">
            <li v-for="e in data.trash" :key="e.id" class="flex min-h-11 items-center justify-between gap-3">
              <span class="truncate">{{ formatDay(e.date) }} · {{ e.title }}</span>
              <AdminButton size="sm" variant="quiet" @click="restore(e)">Restore</AdminButton>
            </li>
          </ul>
        </AdminPanel>
      </div>

      <AdminPanel title="From OnTreasure (read-only)" intro="What your OnTreasure vendor profile lists right now. Edit those on OnTreasure; link one here to add hours or notes.">
        <p v-if="data?.treasure.status !== 'ok'" class="text-sm text-nc-red-bright">OnTreasure could not be reached just now. The site shows its fallback until it is back.</p>
        <p v-else-if="!data.treasure.shows.length" class="text-sm text-nc-mist">Nothing upcoming on OnTreasure.</p>
        <ul v-else role="list" class="divide-y divide-nc-rule">
          <li v-for="s in data.treasure.shows" :key="s.slug" class="flex items-start justify-between gap-3 py-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-nc-red-bright">{{ s.dateLabel }}</p>
              <p class="font-display text-xl leading-tight font-bold">{{ s.title }}</p>
              <p class="text-sm text-nc-mist">{{ s.location }}</p>
            </div>
            <AdminButton size="sm" variant="outline" :to="`/admin/events/new?from=${encodeURIComponent(s.slug)}`">Add here</AdminButton>
          </li>
        </ul>
        <p v-if="data?.treasure.fetchedAt" class="mt-3 text-xs text-white/50">Checked {{ timeAgo(data.treasure.fetchedAt) }}.</p>
      </AdminPanel>
    </div>
  </div>
</template>
