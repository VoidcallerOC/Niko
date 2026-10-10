<script setup lang="ts">
import { feed } from '~/data/media'

const { data: siteData } = await useSiteData()
const visible = computed(() => {
  const { hidden, featured } = siteData.value.instagram
  const shown = feed.filter((p) => !hidden.includes(p.id))
  // Featured posts lead, in the order they were featured; the rest keep feed order.
  return [...featured.map((id) => shown.find((p) => p.id === id)).filter((p): p is (typeof feed)[number] => !!p), ...shown.filter((p) => !featured.includes(p.id))]
})
const feature = computed(() => visible.value[0])
const rest = computed(() => visible.value.slice(1))
const copy = computed(() => siteData.value.copy)

// Nino's Square stock leads the feed once he connects Square; until then (or if
// Square has nothing in stock) the section is the Instagram feed as before.
const { data: squareFeed } = await useSquareFeed()
const stock = computed(() => squareFeed.value.cards)
const SHOWN = 12
const showAll = ref(false)
const shownStock = computed(() => (showAll.value ? stock.value : stock.value.slice(0, SHOWN)))
const price = (cents: number | null, currency: string) =>
  cents === null ? 'Ask' : (cents / 100).toLocaleString('en-US', { style: 'currency', currency, minimumFractionDigits: cents % 100 ? 2 : 0 })
</script>

<template>
  <section id="feed" aria-labelledby="feed-title" class="bg-nc-coal/80">
    <div v-if="stock.length" class="wrap section-pad" data-feed-source="square">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-xl">
          <p class="eyebrow">From the feed</p>
          <h2 id="feed-title" class="mt-3 text-title">In Nino’s case right now</h2>
          <p class="mt-4 text-nc-mist">
            Straight from Nino’s Square inventory, so what you see is in stock. Message him on Instagram to claim a card; first come, first served.
          </p>
          <p v-if="squareFeed.source === 'demo'" class="mt-3 inline-block rounded-sm bg-nc-red px-2 py-1 text-xs font-bold tracking-wide text-white uppercase">Sample data (demo mode)</p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row">
          <LinkButton to="instagram">Ask about a card</LinkButton>
          <LinkButton to="instagram" variant="outline-light">Selling? Send photos</LinkButton>
        </div>
      </div>

      <ul role="list" class="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        <li v-for="c in shownStock" :key="c.key" class="flex flex-col overflow-hidden rounded-md border border-nc-rule bg-nc-char">
          <div class="relative aspect-[3/4] bg-nc-ink">
            <img v-if="c.imageUrl" :src="c.imageUrl" :alt="c.name" loading="lazy" decoding="async" referrerpolicy="no-referrer" class="absolute inset-0 h-full w-full object-cover">
            <span v-else aria-hidden="true" class="absolute inset-0 grid place-items-center font-display text-3xl font-bold text-nc-rule">NC</span>
          </div>
          <div class="flex flex-1 flex-col p-3 sm:p-4">
            <span class="font-display text-xl leading-tight font-bold">{{ c.name }}</span>
            <span v-if="c.description" class="mt-0.5 line-clamp-2 text-sm text-nc-mist">{{ c.description }}</span>
            <span class="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-white/75">
              <strong class="text-lg text-white">{{ price(c.priceCents, c.currency) }}</strong>
              <span v-if="c.quantity !== null && c.quantity > 1">{{ c.quantity }} available</span>
              <span v-else-if="c.quantity === 1">Last one</span>
            </span>
            <div class="mt-auto pt-3">
              <LinkButton to="instagram" size="md" block>
                <span class="whitespace-nowrap sm:hidden">Ask<span class="sr-only"> about {{ c.name }}</span></span><span class="hidden sm:inline">Ask about this card</span>
              </LinkButton>
            </div>
          </div>
        </li>
      </ul>
      <div v-if="stock.length > SHOWN" class="mt-8 text-center">
        <button type="button" class="rounded-sm border border-white/30 px-5 py-3 font-semibold text-white hover:border-white" :aria-expanded="showAll" @click="showAll = !showAll">
          {{ showAll ? 'Show fewer' : `Show all ${stock.length} cards` }}
        </button>
      </div>

      <template v-if="visible.length">
        <h3 class="mt-14 font-display text-2xl font-bold lg:mt-20">Recent pulls on Instagram</h3>
        <ul role="list" class="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-6">
          <li v-for="photo in visible.slice(0, 5)" :key="photo.id">
            <figure>
              <div class="overflow-hidden rounded-sm bg-nc-ink">
                <IgImage :photo="photo" sizes="(min-width: 1024px) 20vw, 50vw" class="aspect-[3/4] w-full object-cover" />
              </div>
              <FeedCaption :photo="photo" />
            </figure>
          </li>
        </ul>
      </template>
    </div>

    <div v-else class="wrap section-pad" data-feed-source="instagram">
      <!-- Intro + feature image -->
      <div class="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div class="lg:col-span-5">
          <p class="eyebrow">From the feed</p>
          <h2 id="feed-title" class="mt-3 text-title">Recent pulls, deals and pack rips</h2>
          <p class="mt-4 max-w-md text-nc-mist">
            {{ copy.feedIntro || 'A handful of Nino’s Instagram posts, mostly One Piece and Pokémon. These are past posts, not a stock list, so ask Nino what’s available before you count on a card.' }}
          </p>
          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <LinkButton to="instagram" block>Ask about a card</LinkButton>
            <LinkButton to="instagram" variant="outline-light" block>Selling? Send photos</LinkButton>
          </div>
        </div>

        <figure v-if="feature" class="lg:col-span-7">
          <div class="overflow-hidden rounded-sm bg-nc-ink">
            <IgImage
              :photo="feature"
              sizes="(min-width: 1024px) 56vw, 100vw"
              class="aspect-[5/4] w-full object-cover object-[50%_40%]"
            />
          </div>
          <FeedCaption :photo="feature" />
        </figure>
      </div>

      <!-- Five-up strip: tops aligned so captions line up; last tile goes full width on phones -->
      <ul role="list" class="mt-10 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:mt-16 lg:grid-cols-5 lg:gap-x-6">
        <li
          v-for="(photo, i) in rest"
          :key="photo.id"
          :class="i === rest.length - 1 && rest.length % 2 === 1 ? 'col-span-2 md:col-span-1' : ''"
        >
          <figure>
            <div class="overflow-hidden rounded-sm bg-nc-ink">
              <IgImage
                :photo="photo"
                sizes="(min-width: 1024px) 20vw, 50vw"
                :class="[
                  'w-full object-cover transition-transform duration-500 hover:scale-[1.03]',
                  i === rest.length - 1 && rest.length % 2 === 1 ? 'aspect-[4/3] md:aspect-[3/4]' : 'aspect-[3/4]',
                ]"
              />
            </div>
            <FeedCaption :photo="photo" />
          </figure>
        </li>
      </ul>
    </div>
  </section>
</template>
