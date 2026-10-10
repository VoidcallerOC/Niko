<script setup lang="ts">
import type { Settings } from '~~/server/utils/admin/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { call } = useAdminApi()
const toast = useAdminToast()
const { data, refresh } = await useAsyncData('admin-settings', () => useRequestFetch()<{ settings: Settings; listed: Array<{ id: string; title: string; photo: string | null }> }>('/api/admin/settings'))

const form = reactive<Settings>(JSON.parse(JSON.stringify(data.value?.settings)))
const saving = ref(false)

const copyFields: Array<{ key: keyof Settings['copy']; label: string; type?: 'textarea' | 'url' | 'email' | 'tel'; hint: string }> = [
  { key: 'heroEyebrow', label: 'Hero line above the headline', hint: 'Site default: “Pokémon & One Piece cards, bought and sold”' },
  { key: 'heroHeadline', label: 'Hero headline', hint: 'Site default: “Nothing but heat.”' },
  { key: 'heroIntro', label: 'Hero intro', type: 'textarea', hint: 'Two sentences about what Nino does.' },
  { key: 'feedIntro', label: 'Feed section intro', type: 'textarea', hint: 'Shown above the Instagram photos.' },
  { key: 'aboutIntro', label: 'About section intro', type: 'textarea', hint: '' },
  { key: 'contactIntro', label: 'Contact line', hint: 'Site default: “Instagram is the way to reach Nino about cards, deals and shows.”' },
]

function toggleFeatured(id: string) {
  form.featuredProductIds = form.featuredProductIds.includes(id) ? form.featuredProductIds.filter((x) => x !== id) : [...form.featuredProductIds, id].slice(0, 8)
}
async function save() {
  saving.value = true
  try {
    const res = await call<{ settings: Settings }>('/api/admin/settings', { method: 'PUT', body: form })
    if (res) {
      toast.saved('Settings saved')
      await refresh()
      await refreshNuxtData('site')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form @submit.prevent="save">
    <AdminPageHead title="Site settings" intro="Public wording, featured cards, links and contact. Empty fields keep the site’s built-in text.">
      <AdminButton type="submit" variant="red" :busy="saving">Save</AdminButton>
    </AdminPageHead>

    <div class="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
      <AdminPanel title="Public copy">
        <div class="grid gap-4">
          <AdminField v-for="f in copyFields" :key="f.key" v-model="form.copy[f.key]" :label="f.label" :type="f.type ?? 'text'" optional :hint="f.hint" :rows="2" />
        </div>
      </AdminPanel>

      <div class="grid min-w-0 content-start gap-5">
        <AdminPanel title="Featured cards" intro="Listed cards shown in their own section at the top of the site, in this order. Up to 8.">
          <p v-if="!data?.listed.length" class="text-sm text-nc-mist">List a card first; only listed cards can be featured.</p>
          <ul v-else role="list" class="grid gap-2">
            <li v-for="p in data.listed" :key="p.id">
              <label class="flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-white/5">
                <input type="checkbox" class="h-6 w-6 accent-nc-red" :checked="form.featuredProductIds.includes(p.id)" @change="toggleFeatured(p.id)">
                <img v-if="p.photo" :src="p.photo" alt="" class="h-10 w-8 rounded-sm object-cover">
                <span class="font-semibold">{{ p.title || 'Untitled' }}</span>
                <span v-if="form.featuredProductIds.includes(p.id)" class="ml-auto text-xs text-white/60">#{{ form.featuredProductIds.indexOf(p.id) + 1 }}</span>
              </label>
            </li>
          </ul>
        </AdminPanel>

        <AdminPanel title="Links & contact">
          <div class="grid gap-4">
            <AdminField v-model="form.copy.instagramUrl" label="Instagram profile" type="url" optional inputmode="url" hint="Default: https://www.instagram.com/ninoscollectibles/" />
            <AdminField v-model="form.copy.onTreasureUrl" label="OnTreasure profile" type="url" optional inputmode="url" hint="Default: https://www.ontreasure.com/u/ninoscollectibles" />
            <AdminField v-model="form.copy.email" label="Public email" type="email" optional inputmode="email" hint="Shown in the contact section only if filled in." />
            <AdminField v-model="form.copy.phone" label="Public phone" type="tel" optional inputmode="tel" hint="Shown in the contact section only if filled in." />
          </div>
        </AdminPanel>

        <AdminPanel title="Inventory">
          <AdminField :model-value="String(form.lowStockThreshold)" label="Low-stock number" type="number" inputmode="numeric" hint="Listed cards at or below this quantity are flagged." @update:model-value="form.lowStockThreshold = Number($event) || 0" />
        </AdminPanel>
      </div>
    </div>

    <div class="mt-6 sm:hidden">
      <AdminButton type="submit" variant="red" size="lg" block :busy="saving">Save settings</AdminButton>
    </div>
  </form>
</template>
