<script setup lang="ts">
/**
 * Cards Nino chose to feature in the admin. Renders nothing until at least one
 * listed card is featured, so the site is unchanged until he uses it.
 */
const { data } = await useSiteData()
const cards = computed(() => data.value.featured)
const price = (c: number | null) => (c === null ? 'Ask' : (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: c % 100 ? 2 : 0 }))
</script>

<template>
  <section v-if="cards.length" id="featured" aria-labelledby="featured-title" class="bg-transparent">
    <div class="wrap section-pad">
      <div class="max-w-xl">
        <p class="eyebrow">Available now</p>
        <h2 id="featured-title" class="mt-3 text-title">Cards on the table</h2>
        <p class="mt-4 text-nc-mist">Picked by Nino. Message him on Instagram to claim one; first come, first served.</p>
      </div>
      <ul role="list" class="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        <li v-for="c in cards" :key="c.id" class="flex flex-col overflow-hidden rounded-md border border-nc-rule bg-nc-char">
          <div class="relative aspect-[3/4] bg-nc-ink">
            <img v-if="c.photo" :src="c.photo.src" :alt="c.photo.alt || c.title" loading="lazy" decoding="async" class="absolute inset-0 h-full w-full object-cover">
            <span v-else aria-hidden="true" class="absolute inset-0 grid place-items-center font-display text-3xl font-bold text-nc-rule">NC</span>
          </div>
          <div class="flex flex-1 flex-col p-3 sm:p-4">
            <span class="font-display text-xl leading-tight font-bold">{{ c.title }}</span>
            <span v-if="c.set || c.cardNumber" class="mt-0.5 text-sm text-nc-mist">{{ [c.set, c.cardNumber].filter(Boolean).join(' · ') }}</span>
            <span class="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-white/75">
              <strong class="text-lg text-white">{{ price(c.priceCents) }}</strong>
              <span v-if="c.grade">{{ c.grade }}</span>
              <span v-else-if="c.condition">{{ c.condition }}</span>
            </span>
            <LinkButton to="instagram" size="md" block class="mt-3">Ask about this card</LinkButton>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
