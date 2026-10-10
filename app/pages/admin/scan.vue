<script setup lang="ts">
import type { PhotoRef, Product } from '~~/server/utils/admin/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

/**
 * Scan = photograph the card on the phone, make a draft, type the details.
 *
 * No card-recognition source was available to reuse (see the build report),
 * so this does not guess the card, price, condition, grade or whether it is
 * for sale. The draft starts with the photos, an optional title, and nothing
 * else decided.
 */
const { call } = useAdminApi()
const toast = useAdminToast()
const photos = ref<PhotoRef[]>([])
const title = ref('')
const busy = ref(false)
const created = ref<Product | null>(null)

async function createDraft(goEdit: boolean) {
  busy.value = true
  try {
    const res = await call<{ product: Product }>('/api/admin/products', { body: { title: title.value, photos: photos.value, availability: 'draft', source: 'scan' } })
    if (!res) return
    toast.saved('Draft created')
    if (goEdit) {
      await navigateTo(`/admin/inventory/${res.product.id}`)
    } else {
      created.value = res.product
      photos.value = []
      title.value = ''
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <AdminPageHead eyebrow="Scan" title="Photograph a card" intro="Front first, then the back if it’s graded or has damage. Each scan becomes a draft; nothing is listed or priced until you do it." />

    <AdminPanel>
      <AdminPhotoPicker v-model="photos" capture />
    </AdminPanel>

    <AdminPanel class="mt-4">
      <AdminField v-model="title" label="Title" optional placeholder="Type it now or on the next screen" />
      <div class="mt-4 grid gap-2">
        <AdminButton variant="red" size="lg" block :disabled="!photos.length" :busy="busy" @click="createDraft(true)">Create draft and fill in details</AdminButton>
        <AdminButton variant="outline" size="lg" block :disabled="!photos.length" :busy="busy" @click="createDraft(false)">Create draft, scan the next card</AdminButton>
      </div>
      <p class="mt-3 text-xs text-white/50">Card recognition is not included in this build: no scanner source was available to reuse. Details are typed, not guessed.</p>
    </AdminPanel>

    <div v-if="created" class="mt-4 rounded-md border border-white/15 bg-nc-char p-4 text-sm">
      Last draft: <NuxtLink :to="`/admin/inventory/${created.id}`" class="font-semibold underline">{{ created.title || 'Untitled card' }}</NuxtLink>
      <span class="text-white/60"> · {{ created.photos.length }} photo{{ created.photos.length === 1 ? '' : 's' }}</span>
    </div>
  </div>
</template>
