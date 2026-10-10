<script setup lang="ts">
import { photos } from '~/data/media'

const hero = photos.vendorSolo
</script>

<template>
  <section aria-labelledby="hero-title" class="relative overflow-hidden bg-nc-ink text-white">
    <!-- Photo: full-bleed on phones, right-hand 58% on desktop -->
    <figure class="relative lg:absolute lg:inset-y-0 lg:right-0 lg:w-[58%]">
      <IgImage
        :photo="hero"
        eager
        sizes="(min-width: 1024px) 58vw, 100vw"
        class="aspect-[4/5] max-h-[68svh] w-full object-cover object-[62%_22%] sm:aspect-[16/11] lg:aspect-auto lg:h-full lg:max-h-none"
      />
      <div
        aria-hidden="true"
        class="absolute inset-0 bg-gradient-to-t from-nc-ink via-nc-ink/10 to-transparent lg:bg-gradient-to-r lg:from-nc-ink lg:via-nc-ink/20 lg:to-transparent"
      />
      <figcaption
        class="absolute top-3 right-3 max-w-[15rem] rounded-md bg-nc-ink/80 px-3 py-2 text-caption text-white/90 backdrop-blur-sm lg:top-auto lg:right-5 lg:bottom-5"
      >
        “{{ hero.caption }}”
        <span class="mt-0.5 block text-white/55">Nino on Instagram, {{ formatPostDate(hero.postDate) }}</span>
      </figcaption>
    </figure>

    <div class="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:flex lg:min-h-[min(calc(100svh-4rem),46rem)] lg:items-center lg:py-20">
      <div class="-mt-28 sm:-mt-32 lg:mt-0 lg:w-[52%]">
        <p class="eyebrow text-white/80 before:bg-nc-red">Pokémon &amp; One Piece cards, bought and sold</p>
        <h1
          id="hero-title"
          class="mt-3 text-hero font-extrabold uppercase italic [text-shadow:0_2px_24px_rgba(0,0,0,0.45)]"
        >
          Nothing<br>but <span class="text-nc-red">heat.</span>
        </h1>
        <p class="mt-5 max-w-md text-lede text-white/80">
          Nino’s Collectibles is Nino’s own trading-card business. He buys and sells cards, rips
          packs and sets up at card shows.
        </p>
        <div class="mt-7 flex flex-col gap-3 sm:flex-row">
          <LinkButton to="instagram" size="lg" block>Message Nino on Instagram</LinkButton>
          <LinkButton to="ontreasure" size="lg" variant="outline-light" block>Find Nino at a show</LinkButton>
        </div>
        <a href="#feed" class="mt-5 inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-white/70 underline-offset-4 hover:text-white hover:underline">
          Browse cards from the feed <span aria-hidden="true">↓</span>
        </a>
      </div>
    </div>
  </section>
</template>
