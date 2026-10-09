<script setup lang="ts">
import { media } from '~/data/media'
import { site } from '~/data/site'
</script>

<template>
  <section aria-labelledby="hero-title" class="relative overflow-hidden">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -top-32 -right-40 h-[28rem] w-[28rem] rounded-full bg-nc-red/10 blur-3xl"
    />
    <div
      class="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pt-16 md:pb-24"
    >
      <div>
        <p class="eyebrow">Buying &amp; selling trading cards</p>
        <h1
          id="hero-title"
          class="mt-4 font-display text-[2.6rem] leading-[0.95] tracking-tight text-nc-black uppercase sm:text-6xl lg:text-7xl"
        >
          Nothing<br>but <span class="text-nc-red">heat.</span>
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-relaxed text-nc-ink/90">
          Nino’s Collectibles is Nino’s card business — buying and selling Pokémon, One Piece and
          more, ripping packs, and setting up at card events. Good cards go quick, so the latest
          drops land on Instagram first.
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <InstagramButton size="lg">See what’s available</InstagramButton>
          <InstagramButton size="lg" variant="outline">Selling cards? DM Nino</InstagramButton>
        </div>
        <p class="mt-5 text-sm text-nc-ink/70">
          Current cards and deals are posted on
          <a
            :href="site.instagramUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold text-nc-black underline decoration-nc-red decoration-2 underline-offset-4 hover:text-nc-red"
          >{{ site.handle }}<span class="sr-only"> (opens in a new tab)</span></a>.
        </p>
      </div>

      <div class="relative">
        <div aria-hidden="true" class="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-nc-red" />
        <div class="relative rounded-2xl border-2 border-nc-black bg-white p-2">
          <MediaSlot :item="media.hero" aspect="aspect-[4/5]" eager />
        </div>
      </div>
    </div>
  </section>
</template>
