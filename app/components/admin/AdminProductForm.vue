<script setup lang="ts">
import type { Product } from '~~/server/utils/admin/types'
import { AVAILABILITY, CONDITIONS } from '~~/server/utils/admin/types'

/**
 * One form for new and existing cards. Only title is required to save a
 * draft; listing needs a price too (checked on the server as well). Price,
 * condition, grade and availability are never filled in for Nino.
 */
const props = defineProps<{ product: Product; saving?: boolean; mode: 'new' | 'edit' }>()
const emit = defineEmits<{ save: [draft: ProductDraft]; cancel: [] }>()

export interface ProductDraft {
  title: string
  game: string
  set: string
  cardNumber: string
  rarity: string
  condition: string
  grade: { company: string; grade: string; certNumber: string }
  priceCents: string
  quantity: string
  availability: string
  photos: Product['photos']
  description: string
  notes: string
}

const draft = reactive<ProductDraft>({
  title: props.product.title,
  game: props.product.game,
  set: props.product.set,
  cardNumber: props.product.cardNumber,
  rarity: props.product.rarity,
  condition: props.product.condition,
  grade: { ...props.product.grade },
  priceCents: centsToInput(props.product.priceCents),
  quantity: String(props.product.quantity),
  availability: props.product.availability,
  photos: [...props.product.photos],
  description: props.product.description,
  notes: props.product.notes,
})

const graded = ref(!!(props.product.grade.company || props.product.grade.grade))
watch(graded, (on) => {
  if (!on) draft.grade = { company: '', grade: '', certNumber: '' }
})

const games = ['Pokémon', 'One Piece', 'Magic: The Gathering', 'Yu-Gi-Oh!', 'Dragon Ball', 'Lorcana', 'Sports', 'Other']
const availabilityLabels: Record<(typeof AVAILABILITY)[number], string> = {
  draft: 'Draft (not on the site)',
  listed: 'Listed (shown on the site)',
  hidden: 'Hidden (kept, not shown)',
  sold: 'Sold',
}
const availabilityOptions = AVAILABILITY.map((v) => ({ value: v, label: availabilityLabels[v] }))
const conditionOptions = CONDITIONS.map((c) => ({ value: c, label: c || 'Not set' }))
const canList = computed(() => draft.title.trim() && draft.priceCents.trim() !== '')

function submit() {
  emit('save', { ...draft, grade: { ...draft.grade }, photos: [...draft.photos] })
}
</script>

<template>
  <form class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6" @submit.prevent="submit">
    <!-- Photos first on phones (that is the show-day order); right column on desktop -->
    <AdminPanel title="Photos" class="lg:col-start-2 lg:row-start-1">
      <AdminPhotoPicker v-model="draft.photos" />
    </AdminPanel>

    <div class="grid gap-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
      <AdminPanel title="Card">
        <div class="grid gap-4">
          <AdminField v-model="draft.title" label="Title" placeholder="e.g. Charizard ex" autocomplete="off" />
          <div class="grid gap-4 sm:grid-cols-2">
            <AdminField v-model="draft.game" label="Game" optional list="nc-games" placeholder="Pokémon, One Piece…" />
            <datalist id="nc-games"><option v-for="g in games" :key="g" :value="g" /></datalist>
            <AdminField v-model="draft.set" label="Set" optional placeholder="e.g. Obsidian Flames" />
            <AdminField v-model="draft.cardNumber" label="Card number" optional placeholder="e.g. 125/197" />
            <AdminField v-model="draft.rarity" label="Rarity" optional placeholder="e.g. Double Rare, SR, Alt Art" />
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="Condition & grade">
        <div class="grid gap-4 sm:grid-cols-2">
          <AdminField v-model="draft.condition" label="Condition" type="select" :options="conditionOptions" optional />
          <div>
            <span class="mb-1.5 block text-sm font-semibold text-white/85">Graded?</span>
            <div class="grid grid-cols-2 gap-2">
              <AdminButton :variant="!graded ? 'white' : 'outline'" @click="graded = false">Raw</AdminButton>
              <AdminButton :variant="graded ? 'white' : 'outline'" @click="graded = true">Graded</AdminButton>
            </div>
          </div>
        </div>
        <div v-if="graded" class="mt-4 grid gap-4 sm:grid-cols-3">
          <AdminField v-model="draft.grade.company" label="Grader" placeholder="PSA, CGC, BGS, TAG" />
          <AdminField v-model="draft.grade.grade" label="Grade" placeholder="10, 9.5…" inputmode="decimal" />
          <AdminField v-model="draft.grade.certNumber" label="Cert number" optional inputmode="numeric" />
        </div>
      </AdminPanel>

      <AdminPanel title="Notes" intro="Description shows on the site when the card is listed. Notes are private.">
        <div class="grid gap-4">
          <AdminField v-model="draft.description" label="Description" type="textarea" optional />
          <AdminField v-model="draft.notes" label="Private notes" type="textarea" optional :rows="2" placeholder="Where it came from, what you paid, who asked about it…" />
        </div>
      </AdminPanel>
    </div>

    <div class="grid content-start gap-5 lg:col-start-2 lg:row-start-2">
      <AdminPanel title="Price & stock">
        <div class="grid gap-4">
          <AdminField v-model="draft.priceCents" label="Price" prefix="$" inputmode="decimal" placeholder="Leave empty until decided" hint="Nothing is listed without a price you typed." />
          <AdminField v-model="draft.quantity" label="Quantity" type="number" inputmode="numeric" />
          <AdminField v-model="draft.availability" label="Availability" type="select" :options="availabilityOptions" />
          <p v-if="draft.availability === 'listed' && !canList" class="text-sm text-nc-red-bright">Listing needs a title and a price.</p>
        </div>
      </AdminPanel>

      <div class="grid gap-2 lg:sticky lg:bottom-4">
        <AdminButton type="submit" variant="red" size="lg" block :busy="saving">{{ mode === 'new' ? 'Save card' : 'Save changes' }}</AdminButton>
        <AdminButton variant="quiet" block @click="emit('cancel')">Cancel</AdminButton>
      </div>
    </div>
  </form>
</template>
