<script setup lang="ts">
import type { Product } from '~~/server/utils/admin/types'

/**
 * One inventory row, phone first: photo, title, status, then the actions
 * Nino uses at a table (quantity, mark sold, hide) as 44px+ targets.
 */
const props = defineProps<{ product: Product; selected: boolean; lowStockThreshold: number; busy?: boolean }>()
const emit = defineEmits<{ select: [on: boolean]; quantity: [delta: number]; availability: [value: Product['availability']]; restore: [] }>()

const status = computed(() => {
  const p = props.product
  if (p.deletedAt) return { label: 'In trash', cls: 'bg-white/10 text-white/70' }
  if (p.availability === 'listed') return p.quantity <= props.lowStockThreshold ? { label: p.quantity === 0 ? 'Listed · out' : 'Listed · low', cls: 'bg-nc-red/20 text-nc-red-bright' } : { label: 'Listed', cls: 'bg-white text-nc-ink' }
  if (p.availability === 'draft') return { label: 'Draft', cls: 'bg-white/10 text-white/80' }
  if (p.availability === 'hidden') return { label: 'Hidden', cls: 'bg-white/10 text-white/60' }
  return { label: 'Sold', cls: 'bg-nc-char text-white/60 line-through' }
})
const meta = computed(() => [props.product.game, props.product.set, props.product.cardNumber].filter(Boolean).join(' · '))
const grade = computed(() => (props.product.grade.company && props.product.grade.grade ? `${props.product.grade.company} ${props.product.grade.grade}` : props.product.condition))
</script>

<template>
  <li class="min-w-0 rounded-lg border bg-nc-coal/80 p-3 sm:p-4" :class="selected ? 'border-nc-red' : 'border-nc-rule'">
    <div class="flex gap-3">
      <label class="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-start justify-center pt-1">
        <input type="checkbox" :checked="selected" class="h-6 w-6 accent-nc-red" :aria-label="`Select ${product.title || 'untitled card'}`" @change="emit('select', ($event.target as HTMLInputElement).checked)">
      </label>
      <NuxtLink :to="`/admin/inventory/${product.id}`" class="h-20 w-[3.75rem] shrink-0 overflow-hidden rounded-md bg-nc-char">
        <img v-if="product.photos[0]" :src="product.photos[0].src" :alt="product.photos[0].alt || ''" class="h-full w-full object-cover">
        <span v-else class="grid h-full w-full place-items-center font-display text-lg font-bold text-nc-rule">NC</span>
      </NuxtLink>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <NuxtLink :to="`/admin/inventory/${product.id}`" class="inline-flex min-h-11 items-center font-display text-xl leading-tight font-bold hover:underline">{{ product.title || 'Untitled card' }}</NuxtLink>
          <span class="rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-wide uppercase" :class="status.cls">{{ status.label }}</span>
          <span v-if="product.source === 'demo'" class="rounded-sm bg-nc-red/80 px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-wide text-white uppercase">Sample</span>
        </div>
        <p v-if="meta" class="mt-0.5 truncate text-sm text-nc-mist">{{ meta }}</p>
        <p class="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
          <strong class="text-base">{{ product.priceCents === null ? 'No price' : formatCents(product.priceCents) }}</strong>
          <span v-if="grade" class="text-white/70">{{ grade }}</span>
          <span class="text-white/70">Qty {{ product.quantity }}</span>
        </p>
      </div>
    </div>

    <div v-if="product.deletedAt" class="mt-3 flex justify-end">
      <AdminButton variant="white" size="sm" :busy="busy" @click="emit('restore')">Restore</AdminButton>
    </div>
    <div v-else class="mt-3 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:flex sm:flex-wrap sm:justify-end">
      <div class="inline-flex items-stretch overflow-hidden rounded-md ring-1 ring-white/25 ring-inset" role="group" aria-label="Quantity">
        <button type="button" class="min-h-11 min-w-11 px-2 text-xl hover:bg-white/10 disabled:opacity-40" :disabled="busy || product.quantity === 0" aria-label="One fewer" @click="emit('quantity', -1)">−</button>
        <span class="grid min-w-9 place-items-center text-sm font-bold tabular-nums">{{ product.quantity }}</span>
        <button type="button" class="min-h-11 min-w-11 px-2 text-xl hover:bg-white/10" :disabled="busy" aria-label="One more" @click="emit('quantity', 1)">+</button>
      </div>
      <AdminButton v-if="product.availability === 'listed' || product.availability === 'hidden'" variant="white" size="sm" :busy="busy" @click="emit('availability', 'sold')">Mark sold</AdminButton>
      <AdminButton v-else-if="product.availability === 'draft'" variant="outline" size="sm" :to="`/admin/inventory/${product.id}`">Finish draft</AdminButton>
      <AdminButton v-else variant="outline" size="sm" :busy="busy" @click="emit('availability', 'listed')">Relist</AdminButton>
      <AdminButton v-if="product.availability === 'listed'" variant="outline" size="sm" :busy="busy" @click="emit('availability', 'hidden')">Hide</AdminButton>
      <AdminButton v-else-if="product.availability === 'hidden' || product.availability === 'draft'" variant="outline" size="sm" :busy="busy" :disabled="!product.title || product.priceCents === null" @click="emit('availability', 'listed')">List</AdminButton>
      <AdminButton v-else variant="quiet" size="sm" :to="`/admin/inventory/${product.id}`">Edit</AdminButton>
    </div>
  </li>
</template>
