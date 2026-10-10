<script setup lang="ts">
import { feed } from '~/data/media'

/*
 * Editorial mosaic: tile shapes vary on purpose so the grid reads like a
 * contact sheet from the feed rather than a product listing.
 * Mobile: 2 columns, first tile full width. Desktop: 12-column layout.
 */
const layout = [
  { tile: 'col-span-2 lg:col-span-6 lg:row-span-2', img: 'aspect-square lg:absolute lg:inset-0 lg:aspect-auto lg:h-full' },
  { tile: 'lg:col-span-3 lg:row-span-2', img: 'aspect-[3/4] lg:absolute lg:inset-0 lg:aspect-auto lg:h-full' },
  { tile: 'lg:col-span-3 lg:row-span-2', img: 'aspect-[3/4] lg:absolute lg:inset-0 lg:aspect-auto lg:h-full' },
  { tile: 'lg:col-span-4', img: 'aspect-[3/4] lg:aspect-[4/5]' },
  { tile: 'lg:col-span-4', img: 'aspect-[3/4] lg:aspect-[4/5]' },
  { tile: 'col-span-2 lg:col-span-4', img: 'aspect-[4/3] lg:aspect-[4/5]' },
] as const
</script>

<template>
  <section id="feed" aria-labelledby="feed-title" class="bg-nc-paper">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
      <div class="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div class="lg:col-span-7">
          <p class="meta text-nc-red">01 — Collector’s feed</p>
          <h2 id="feed-title" class="mt-3 font-display text-5xl leading-[0.9] uppercase sm:text-7xl">
            Straight off <br class="hidden sm:block">the feed.
          </h2>
        </div>
        <p class="max-w-md text-base leading-relaxed text-nc-muted lg:col-span-5 lg:justify-self-end">
          Pulls, deals and pack rips Nino has posted: mostly One Piece and Pokémon. These are past
          posts, not a stock list, so <strong class="font-semibold text-nc-ink">ask Nino what’s
          available</strong> before you count on a card.
        </p>
      </div>

      <ul role="list" class="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-14 lg:grid-cols-12 lg:grid-rows-[repeat(2,minmax(0,17rem))_auto]">
        <li v-for="(photo, i) in feed" :key="photo.id" :class="layout[i]?.tile">
          <figure class="group flex h-full flex-col">
            <div class="relative flex-1 overflow-hidden bg-nc-ink">
              <IgImage
                :photo="photo"
                :sizes="i === 0 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 33vw, 50vw'"
                :class="[
                  'w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]',
                  layout[i]?.img,
                ]"
              />
              <span
                v-if="photo.tag"
                class="meta absolute top-2 left-2 bg-nc-ink px-2 py-1 text-white"
              >{{ photo.tag }}</span>
            </div>
            <figcaption class="mt-2 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <span class="text-sm leading-snug font-medium">“{{ photo.caption }}”</span>
              <span class="meta shrink-0 text-nc-muted">{{ formatPostDate(photo.postDate) }}</span>
            </figcaption>
          </figure>
        </li>
      </ul>

      <div class="mt-12 flex flex-col gap-5 border-t border-nc-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p class="max-w-xl font-display text-2xl leading-tight uppercase sm:text-3xl">
          Saw something you like? <span class="text-nc-red">Ask about it.</span>
        </p>
        <div class="flex flex-col gap-3 sm:flex-row">
          <LinkButton to="instagram" block>DM Nino about a card</LinkButton>
          <LinkButton to="instagram" variant="outline-ink" block>Selling? Send photos</LinkButton>
        </div>
      </div>
    </div>
  </section>
</template>
