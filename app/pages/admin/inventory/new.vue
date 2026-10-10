<script setup lang="ts">
import type { Product } from '~~/server/utils/admin/types'
import { emptyProduct } from '~~/server/utils/admin/types'
import type { ProductDraft } from '~/components/admin/AdminProductForm.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { call } = useAdminApi()
const toast = useAdminToast()
const saving = ref(false)
const blank = emptyProduct(new Date().toISOString())

async function save(draft: ProductDraft) {
  saving.value = true
  try {
    const res = await call<{ product: Product }>('/api/admin/products', { body: draft })
    if (res) {
      toast.saved(res.product.availability === 'listed' ? 'Saved and listed' : 'Saved as draft')
      await navigateTo(`/admin/inventory/${res.product.id}`, { replace: true })
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHead title="Add a card" intro="Only the title is needed to save. Listing it on the site needs a price too." />
    <AdminProductForm :product="blank" mode="new" :saving="saving" @save="save" @cancel="navigateTo('/admin/inventory')" />
  </div>
</template>
