<script setup lang="ts">
import { photos } from '~/data/media'

const table = photos.tableDeals
const banner = ['Buy', 'Sell', 'Trade', 'Collect'] as const
</script>

<template>
  <section id="shows" aria-labelledby="shows-title" class="bg-nc-ink">
    <div class="mx-auto max-w-7xl lg:grid lg:grid-cols-12 lg:items-center lg:px-6 lg:py-24">
      <figure class="relative lg:col-span-8 lg:col-start-1 lg:row-start-1">
        <IgImage
          :photo="table"
          sizes="(min-width: 1024px) 66vw, 100vw"
          class="aspect-[4/3] w-full object-cover object-[50%_72%] lg:aspect-[16/11] lg:rounded-sm"
        />
        <figcaption class="absolute top-3 left-3 rounded-md bg-nc-ink/80 px-3 py-1.5 text-caption text-white backdrop-blur-sm">
          “{{ table.caption }}” · {{ formatPostDate(table.postDate) }}
        </figcaption>
      </figure>

      <!-- Panel overlaps the photo: below it on phones, beside it on desktop -->
      <div
        class="relative z-10 mx-4 -mt-14 border-t-4 border-nc-red bg-nc-char p-6 text-white shadow-[0_24px_50px_-20px_rgba(0,0,0,0.8)] sm:mx-6 sm:p-8 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:mx-0 lg:mt-0"
      >
        <p class="eyebrow">Vending events</p>
        <h2 id="shows-title" class="mt-3 text-title">Find Nino at a show</h2>
        <p class="mt-4 text-nc-mist">
          Nino sets up at card shows. The ones he’s vending are listed on his OnTreasure profile.
          Check there for dates before you head out.
        </p>
        <LinkButton to="ontreasure" size="lg" class="mt-6 w-full">Find Nino at a show</LinkButton>

        <div class="mt-6 border-t border-nc-rule pt-5">
          <p class="text-sm text-nc-mist">At the show, look for the black Nino’s Collectibles banner:</p>
          <ul
            class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-2xl font-bold uppercase"
            aria-label="Banner text: Buy, Sell, Trade, Collect"
          >
            <template v-for="(word, i) in banner" :key="word">
              <li v-if="i > 0" aria-hidden="true" class="text-nc-red">·</li>
              <li>{{ word }}</li>
            </template>
          </ul>
        </div>
      </div>
    </div>
    <div class="h-12 lg:hidden" aria-hidden="true" />
  </section>
</template>
