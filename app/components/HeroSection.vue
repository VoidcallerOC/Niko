<script setup lang="ts">
import { photos } from '~/data/media'

const hero = photos.vendorSolo
</script>

<template>
  <section aria-labelledby="hero-title" class="relative isolate overflow-hidden bg-nc-ink text-white">
    <div class="mx-auto grid max-w-7xl lg:grid-cols-12 lg:gap-10 lg:px-6">
      <div class="px-4 pt-10 pb-8 sm:px-6 lg:col-span-6 lg:px-0 lg:pt-20 lg:pb-16">
        <p class="meta text-white/60">
          <span class="text-nc-red">●</span> Pokémon · One Piece · Buying &amp; selling
        </p>
        <h1
          id="hero-title"
          class="mt-5 font-display text-[clamp(3.6rem,17vw,6rem)] lg:text-[clamp(5rem,7.4vw,7.75rem)] leading-[0.86] tracking-tight uppercase"
        >
          Nothing<br>but <span class="slash">heat.</span>
        </h1>
        <p class="mt-6 max-w-lg text-lg leading-relaxed text-white/80">
          Nino’s Collectibles is Nino’s own trading-card business. He buys and sells cards, rips
          packs and vends at card shows. Seen a card on the feed? Send him a message.
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <LinkButton to="instagram" size="lg" block>Message on Instagram</LinkButton>
          <LinkButton to="ontreasure" size="lg" variant="outline-light" block>Find Nino at a show</LinkButton>
        </div>
        <a href="#feed" class="meta mt-6 inline-flex min-h-11 items-center gap-2 text-white/70 hover:text-white">
          See cards from the feed <span aria-hidden="true">↓</span>
        </a>
      </div>

      <figure class="relative lg:col-span-6 lg:mt-10 lg:mb-[-1px]">
        <IgImage
          :photo="hero"
          eager
          sizes="(min-width: 1024px) 50vw, 100vw"
          class="aspect-[5/4] w-full object-cover object-[60%_30%] lg:aspect-auto lg:h-full lg:min-h-[34rem]"
        />
        <figcaption
          class="absolute right-3 bottom-3 left-3 max-w-sm bg-nc-ink/85 px-4 py-3 backdrop-blur-sm sm:left-auto"
        >
          <p class="text-sm leading-snug text-white">“{{ hero.caption }}”</p>
          <p class="meta mt-1.5 text-white/55">
            Nino on Instagram · {{ formatPostDate(hero.postDate) }}
          </p>
        </figcaption>
      </figure>
    </div>

    <div class="border-t border-white/10">
      <ul
        class="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-4 font-display text-xl tracking-wide uppercase sm:justify-start sm:px-6 sm:text-2xl"
        aria-label="From the table banner"
      >
        <li>Buy</li>
        <li aria-hidden="true" class="text-nc-red">/</li>
        <li>Sell</li>
        <li aria-hidden="true" class="text-nc-red">/</li>
        <li>Trade</li>
        <li aria-hidden="true" class="text-nc-red">/</li>
        <li>Collect</li>
      </ul>
    </div>
  </section>
</template>
