<script setup lang="ts">
import { logo } from '~/data/media'
import { site } from '~/data/site'

const reasons = [
  { n: '01', title: 'Buying', body: 'Saw a card in a post? DM Nino and ask if it’s still around.', to: 'instagram' },
  { n: '02', title: 'Selling', body: 'Got cards to move? Send Nino photos of what you have.', to: 'instagram' },
  { n: '03', title: 'Shows', body: 'Want to meet at a show? Check his OnTreasure profile for where he’s vending.', to: 'ontreasure' },
] as const
</script>

<template>
  <section id="contact" aria-labelledby="contact-title" class="border-t-8 border-nc-red bg-white">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
      <div class="flex items-start justify-between gap-6">
        <div>
          <p class="meta text-nc-red">05 — Contact</p>
          <h2 id="contact-title" class="mt-3 font-display text-5xl leading-[0.9] uppercase sm:text-7xl">
            Hit the DMs.
          </h2>
          <p class="mt-4 max-w-xl text-lg text-nc-muted">
            Instagram is the way to reach Nino about cards, deals and shows.
          </p>
        </div>
        <picture class="hidden shrink-0 sm:block">
          <source :srcset="logo.full.srcset" sizes="13rem" type="image/webp">
          <img :src="logo.full.fallback" alt="" width="640" height="640" class="h-44 w-44 lg:h-52 lg:w-52">
        </picture>
      </div>

      <a
        :href="site.instagramUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="group mt-8 inline-flex min-h-11 max-w-full items-center gap-3 font-display text-[clamp(2rem,9vw,5.5rem)] leading-none break-all uppercase hover:text-nc-red sm:break-normal"
      >
        <IconInstagram class="h-[0.7em] w-[0.7em] shrink-0 text-nc-red" />
        <span>{{ site.handle }}</span>
        <span class="sr-only">(opens on Instagram in a new tab)</span>
      </a>

      <ol role="list" class="mt-12 border-t border-nc-ink">
        <li v-for="r in reasons" :key="r.n" class="border-b border-nc-line">
          <a
            :href="r.to === 'instagram' ? site.instagramUrl : site.onTreasureUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 gap-y-1 py-5 sm:grid-cols-[4rem_10rem_1fr_auto]"
          >
            <span class="meta text-nc-red">{{ r.n }}</span>
            <span class="font-display text-2xl uppercase">{{ r.title }}</span>
            <span class="col-start-2 text-nc-muted sm:col-start-auto">{{ r.body }}</span>
            <span
              aria-hidden="true"
              class="col-start-3 row-span-2 row-start-1 text-2xl transition-transform group-hover:translate-x-1 sm:col-start-auto sm:row-span-1 sm:row-start-auto"
            >→</span>
            <span class="sr-only">
              ({{ r.to === 'instagram' ? `opens ${site.handle} on Instagram` : 'opens Nino’s OnTreasure profile' }} in a new tab)
            </span>
          </a>
        </li>
      </ol>
    </div>
  </section>
</template>
