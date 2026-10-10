<script setup lang="ts">
import type { Settings } from '~~/server/utils/admin/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { call } = useAdminApi()
const toast = useAdminToast()
const { data, refresh } = await useAsyncData('admin-settings', () => useRequestFetch()<{ settings: Settings; listed: Array<{ id: string; title: string; photo: string | null }> }>('/api/admin/settings'))

const form = reactive<Settings>(JSON.parse(JSON.stringify(data.value?.settings)))
const saving = ref(false)

interface SessionInfo {
  demo: boolean
  methods: { square: boolean }
  owner: { bound: boolean; email?: string; businessName?: string; source?: string; hasPassword?: boolean; squareLinked?: boolean }
}
const { data: who, refresh: refreshWho } = await useAsyncData('admin-session', () => useRequestFetch()<SessionInfo>('/api/admin/auth/session'))
const pw = reactive({ email: '', current: '', password: '', confirm: '' })
const pwBusy = ref(false)
async function savePassword() {
  pwBusy.value = true
  try {
    const res = await call<{ ok: true; email: string }>('/api/admin/auth/password', { body: { ...pw } })
    if (res) {
      toast.saved(who.value?.owner.hasPassword ? 'Password changed' : 'Password set')
      pw.current = pw.password = pw.confirm = ''
      await refreshWho()
    }
  } finally {
    pwBusy.value = false
  }
}

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
  <!-- A div, not a form: the owner password panel below holds its own form, and forms cannot nest. -->
  <div>
    <AdminPageHead title="Site settings" intro="Public wording, featured cards, links and contact. Empty fields keep the site’s built-in text.">
      <AdminButton variant="red" :busy="saving" @click="save">Save</AdminButton>
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

        <AdminPanel title="Owner sign-in" intro="Who can open this admin.">
          <dl v-if="who?.owner.bound" class="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt class="text-white/60">Email</dt><dd class="font-semibold">{{ who.owner.email || 'not set' }}</dd></div>
            <div><dt class="text-white/60">Square</dt><dd class="font-semibold">{{ who.owner.squareLinked ? (who.owner.businessName || 'linked') : 'not linked' }}<span v-if="who.owner.source === 'demo'" class="ml-2 rounded-sm bg-nc-red px-1.5 py-0.5 text-[0.6875rem] font-bold text-white uppercase">Sample</span></dd></div>
          </dl>
          <p v-else class="text-sm text-nc-mist">{{ who?.demo ? 'Demo mode: no owner account.' : 'No owner account yet.' }}</p>
          <a v-if="who?.owner.bound && !who.owner.squareLinked && who.methods.square" href="/api/admin/auth/square/start?next=%2Fadmin%2Fsettings" class="mt-3 inline-flex min-h-12 items-center justify-center rounded-md bg-white px-4 text-[0.9375rem] font-semibold text-nc-ink hover:bg-white/85">Link my Square account</a>
          <form v-if="who?.owner.bound && !who.demo" class="mt-4 grid gap-3 border-t border-nc-rule pt-4" @submit.prevent="savePassword">
            <p class="text-sm font-semibold">{{ who.owner.hasPassword ? 'Change password' : 'Set a password (so you can sign in without Square)' }}</p>
            <AdminField v-if="!who.owner.email" v-model="pw.email" label="Sign-in email" type="email" inputmode="email" autocomplete="username" />
            <AdminField v-if="who.owner.hasPassword" v-model="pw.current" label="Current password" type="password" autocomplete="current-password" />
            <AdminField v-model="pw.password" label="New password" type="password" autocomplete="new-password" hint="At least 12 characters." />
            <AdminField v-model="pw.confirm" label="Repeat new password" type="password" autocomplete="new-password" />
            <div><AdminButton type="submit" variant="white" :busy="pwBusy" :disabled="!pw.password || !pw.confirm">{{ who.owner.hasPassword ? 'Change password' : 'Set password' }}</AdminButton></div>
          </form>
        </AdminPanel>

        <AdminPanel title="Inventory">
          <AdminField :model-value="String(form.lowStockThreshold)" label="Low-stock number" type="number" inputmode="numeric" hint="Listed cards at or below this quantity are flagged." @update:model-value="form.lowStockThreshold = Number($event) || 0" />
        </AdminPanel>
      </div>
    </div>

    <div class="mt-6 sm:hidden">
      <AdminButton variant="red" size="lg" block :busy="saving" @click="save">Save settings</AdminButton>
    </div>
  </div>
</template>
