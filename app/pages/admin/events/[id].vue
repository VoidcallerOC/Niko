<script setup lang="ts">
import type { StoreEvent } from '~~/server/utils/admin/types'
import type { TreasureResult } from '~~/server/utils/treasureShows'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = computed(() => String(route.params.id))
const isNew = computed(() => id.value === 'new')
const { call } = useAdminApi()
const toast = useAdminToast()

const { data } = await useAsyncData('admin-events', () => useRequestFetch()<{ events: StoreEvent[]; trash: StoreEvent[]; treasure: TreasureResult }>('/api/admin/events'))
const existing = computed(() => [...(data.value?.events ?? []), ...(data.value?.trash ?? [])].find((e) => e.id === id.value) ?? null)
if (!isNew.value && !existing.value) throw createError({ statusCode: 404, statusMessage: 'Event not found' })

// "Add here" from the OnTreasure list pre-fills what OnTreasure says; nothing is invented.
const from = typeof route.query.from === 'string' ? data.value?.treasure.shows.find((s) => s.slug === route.query.from) : undefined

const form = reactive({
  title: existing.value?.title ?? from?.title ?? '',
  date: existing.value?.date ?? from?.startDate ?? '',
  endDate: existing.value?.endDate ?? from?.endDate ?? '',
  hours: existing.value?.hours ?? '',
  venue: existing.value?.venue ?? from?.venue ?? '',
  city: existing.value?.city ?? from?.city ?? '',
  state: existing.value?.state ?? from?.state ?? '',
  url: existing.value?.url ?? from?.url ?? '',
  notes: existing.value?.notes ?? '',
  published: existing.value?.published ?? false,
})
const saving = ref(false)
const confirmTrash = ref(false)

async function save() {
  saving.value = true
  try {
    const res = isNew.value
      ? await call<{ event: StoreEvent }>('/api/admin/events', { body: form })
      : await call<{ event: StoreEvent }>(`/api/admin/events/${id.value}`, { method: 'PUT', body: form })
    if (res) {
      toast.saved(form.published ? 'Saved and shown on the site' : 'Saved (hidden)')
      await navigateTo('/admin/events')
    }
  } finally {
    saving.value = false
  }
}
async function trash() {
  const res = await call(`/api/admin/events/${id.value}`, { method: 'DELETE' })
  confirmTrash.value = false
  if (res) {
    toast.saved('Moved to trash')
    await navigateTo('/admin/events')
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AdminPageHead :title="isNew ? 'Add an event' : existing?.title || 'Event'" :intro="from ? 'Pre-filled from your OnTreasure listing. Check it, add hours or notes, then save.' : undefined">
      <AdminButton v-if="!isNew && !existing?.deletedAt" variant="danger" @click="confirmTrash = true">Move to trash</AdminButton>
    </AdminPageHead>

    <form class="grid gap-5" @submit.prevent="save">
      <AdminPanel>
        <div class="grid gap-4">
          <AdminField v-model="form.title" label="Event name" placeholder="e.g. Hartford Card Show" />
          <div class="grid gap-4 sm:grid-cols-2">
            <AdminField v-model="form.date" label="Date" type="date" />
            <AdminField v-model="form.endDate" label="Last day" type="date" optional hint="Leave empty for a one-day show." />
          </div>
          <AdminField v-model="form.hours" label="Hours" optional placeholder="e.g. 10am–4pm" />
        </div>
      </AdminPanel>
      <AdminPanel title="Where">
        <div class="grid gap-4">
          <AdminField v-model="form.venue" label="Venue" optional />
          <div class="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <AdminField v-model="form.city" label="City" optional />
            <AdminField v-model="form.state" label="State" optional placeholder="CT" />
          </div>
          <AdminField v-model="form.url" label="Link" type="url" optional inputmode="url" placeholder="https://www.ontreasure.com/…" hint="OnTreasure event page or the venue’s page." />
          <AdminField v-model="form.notes" label="Notes for the site" type="textarea" optional :rows="2" placeholder="Table number, what you’re bringing…" />
        </div>
      </AdminPanel>
      <AdminPanel>
        <label class="flex min-h-12 cursor-pointer items-center gap-3">
          <input v-model="form.published" type="checkbox" class="h-6 w-6 accent-nc-red">
          <span class="font-semibold">Show this event on the site</span>
        </label>
      </AdminPanel>
      <div class="grid gap-2">
        <AdminButton type="submit" variant="red" size="lg" block :busy="saving">{{ isNew ? 'Save event' : 'Save changes' }}</AdminButton>
        <AdminButton variant="quiet" block @click="navigateTo('/admin/events')">Cancel</AdminButton>
      </div>
    </form>

    <AdminConfirm :open="confirmTrash" title="Move this event to the trash?" confirm-label="Move to trash" danger @confirm="trash" @cancel="confirmTrash = false">
      <p>It leaves the site right away and can be restored from the Events page.</p>
    </AdminConfirm>
  </div>
</template>
