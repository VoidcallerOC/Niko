<script setup lang="ts">
import { media } from '~/data/media'

const games = [
  {
    name: 'Pokémon',
    photo: media.pokemon,
    blurb: 'Card deals and fresh pulls from pack openings, straight from the feed.',
  },
  {
    name: 'One Piece',
    photo: media.onePiece,
    blurb: 'One Piece cards in the mix too, posted as they come in.',
  },
] as const
</script>

<template>
  <section id="cards" aria-labelledby="cards-title" class="border-y border-nc-line bg-white">
    <div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div class="max-w-2xl">
          <p class="eyebrow">Cards &amp; collecting</p>
          <h2 id="cards-title" class="mt-3 font-display text-3xl leading-tight text-nc-black uppercase sm:text-5xl">
            Pokémon. One Piece.<br class="hidden sm:block"> Ripped, pulled, posted.
          </h2>
          <p class="mt-4 text-lg text-nc-ink/85">
            Card photos on this page come from Nino’s own posts. What’s available changes fast, so
            current cards and deals live on Instagram — not here.
          </p>
        </div>
      </div>

      <ul class="mt-12 grid gap-6 md:grid-cols-2" role="list">
        <li
          v-for="game in games"
          :key="game.name"
          class="group overflow-hidden rounded-3xl border-2 border-nc-black bg-nc-paper"
        >
          <div class="p-3 pb-0">
            <MediaSlot :item="game.photo" aspect="aspect-[4/3]" />
          </div>
          <div class="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="font-display text-2xl text-nc-black uppercase">{{ game.name }}</h3>
              <p class="mt-1 text-sm text-nc-ink/80">{{ game.blurb }}</p>
            </div>
            <InstagramButton variant="dark" class="shrink-0">
              View {{ game.name }} cards
            </InstagramButton>
          </div>
        </li>
      </ul>

      <h3 class="mt-16 text-sm font-bold tracking-[0.2em] text-nc-black uppercase">From the feed</h3>
      <ul class="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4" role="list">
        <li
          v-for="(shot, i) in media.feed"
          :key="shot.label"
          :class="[
            'transition-transform duration-300 motion-safe:hover:-translate-y-1',
            i % 2 === 0 ? 'motion-safe:hover:-rotate-1' : 'motion-safe:hover:rotate-1',
          ]"
        >
          <MediaSlot :item="shot" aspect="aspect-[5/7]" />
        </li>
      </ul>

      <div
        class="mt-14 grid gap-6 rounded-3xl bg-nc-black p-6 text-white sm:p-10 md:grid-cols-[1.4fr_1fr] md:items-center"
      >
        <div>
          <h3 class="font-display text-2xl uppercase sm:text-3xl">
            See a card you want? <span class="text-nc-red">Ask about a deal.</span>
          </h3>
          <p class="mt-3 text-white/80">
            Send Nino a DM with the card or post you’re after. Have cards to sell? Send photos the
            same way — Nino buys too.
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row md:justify-end">
          <InstagramButton>Ask about a deal</InstagramButton>
          <InstagramButton variant="outline-light">Browse latest posts</InstagramButton>
        </div>
      </div>
    </div>
  </section>
</template>
