<script setup lang="ts">
import type { Product } from '~~/server/utils/admin/types'
import type { ProductDraft } from '~/components/admin/AdminProductForm.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = computed(() => String(route.params.id))
const { call } = useAdminApi()
const toast = useAdminToast()

interface Loaded {
  product: Product
  revisions: Array<{ id: string; at: string; title: string; priceCents: number | null; quantity: number; availability: string }>
}
const { data, error, refresh } = await useAsyncData(`admin-product-${id.value}`, () => useRequestFetch()<Loaded>(`/api/admin/products/${id.value}`))
const saving = ref(false)
const confirmTrash = ref(false)
const confirmRevert = ref<Loaded['revisions'][number] | null>(null)
const formKey = ref(0)

async function save(draft: ProductDraft) {
  saving.value = true
  try {
    const res = await call<{ product: Product }>(`/api/admin/products/${id.value}`, { method: 'PUT', body: draft })
    if (res) {
      toast.saved('Saved')
      await refresh()
    }
  } finally {
    saving.value = false
  }
}
async function trash() {
  const res = await call(`/api/admin/products/${id.value}`, { method: 'DELETE' })
  confirmTrash.value = false
  if (res) {
    toast.saved('Moved to trash')
    await navigateTo('/admin/inventory?filter=trash')
  }
}
async function restore() {
  const res = await call(`/api/admin/products/${id.value}/restore`)
  if (res) {
    toast.saved('Restored')
    await refresh()
  }
}
async function revert() {
  if (!confirmRevert.value) return
  const res = await call(`/api/admin/products/${id.value}/revert`, { body: { revisionId: confirmRevert.value.id } })
  confirmRevert.value = null
  if (res) {
    toast.saved('Earlier version restored')
    await refresh()
    formKey.value += 1
  }
}
</script>

<template>
  <div>
    <p v-if="error" class="text-nc-red-bright">{{ errorMessage(error) }}</p>
    <template v-else-if="data">
      <AdminPageHead :title="data.product.title || 'Untitled card'" :intro="data.product.deletedAt ? 'This card is in the trash.' : `Last saved ${timeAgo(data.product.updatedAt)}`">
        <AdminButton v-if="data.product.deletedAt" variant="white" @click="restore">Restore</AdminButton>
        <AdminButton v-else variant="danger" @click="confirmTrash = true">Move to trash</AdminButton>
      </AdminPageHead>

      <div v-if="data.product.squareId" class="mb-5 rounded-md border border-white/15 bg-nc-char px-4 py-3 text-sm text-white/80">
        Linked to Square item <code class="font-mono text-white">{{ data.product.squareId }}</code>. Field ownership:
        <span v-for="(owner, field) in data.product.fieldOwners" :key="field" class="ml-2 rounded-sm bg-white/10 px-1.5 py-0.5 text-xs">{{ field }} → {{ owner }}</span>
        <span v-if="!Object.keys(data.product.fieldOwners).length" class="ml-1">local wins everywhere until you choose otherwise on the Square page.</span>
      </div>

      <AdminProductForm :key="formKey" :product="data.product" mode="edit" :saving="saving" @save="save" @cancel="navigateTo('/admin/inventory')" />

      <AdminPanel v-if="data.revisions.length" class="mt-6" title="Earlier versions" intro="Every save keeps the version before it. Restoring one keeps today’s version too.">
        <ul role="list" class="divide-y divide-nc-rule">
          <li v-for="r in data.revisions" :key="r.id" class="flex min-h-12 flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span><time :datetime="r.at">{{ timeAgo(r.at) }}</time> · {{ r.title || 'Untitled' }} · {{ r.priceCents === null ? 'no price' : formatCents(r.priceCents) }} · qty {{ r.quantity }} · {{ r.availability }}</span>
            <AdminButton size="sm" variant="quiet" @click="confirmRevert = r">Restore this</AdminButton>
          </li>
        </ul>
      </AdminPanel>

      <AdminConfirm :open="confirmTrash" title="Move this card to the trash?" confirm-label="Move to trash" danger @confirm="trash" @cancel="confirmTrash = false">
        <p>It leaves the site right away. You can restore it from Inventory → Trash.</p>
      </AdminConfirm>
      <AdminConfirm :open="!!confirmRevert" title="Restore this earlier version?" confirm-label="Restore" @confirm="revert" @cancel="confirmRevert = null">
        <p v-if="confirmRevert">The card goes back to: {{ confirmRevert.title || 'Untitled' }}, {{ confirmRevert.priceCents === null ? 'no price' : formatCents(confirmRevert.priceCents) }}, qty {{ confirmRevert.quantity }}, {{ confirmRevert.availability }}. The current version is kept in the list.</p>
      </AdminConfirm>
    </template>
  </div>
</template>
