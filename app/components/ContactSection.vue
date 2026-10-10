<script setup lang="ts">
import { site } from '~/data/site'

const reasons = [
  { title: 'Buying', body: 'Saw a card in a post? Ask Nino if it’s still around.', to: 'instagram' },
  { title: 'Selling', body: 'Got cards to move? Send Nino photos of what you have.', to: 'instagram' },
  { title: 'Shows', body: 'Want to meet in person? See where he’s vending on OnTreasure.', to: 'ontreasure' },
] as const
</script>

<template>
  <section id="contact" aria-labelledby="contact-title" class="bg-nc-coal text-white">
    <div class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <div class="grid items-center gap-8 md:grid-cols-[13rem_1fr] lg:grid-cols-[16rem_1fr] lg:gap-14">
        <div class="mx-auto w-40 md:w-full">
          <BrandMark variant="full" />
        </div>

        <div>
          <p class="eyebrow">Contact</p>
          <h2 id="contact-title" class="mt-3 text-title">Hit the DMs</h2>
          <p class="mt-3 text-lede text-white/75">Instagram is the way to reach Nino about cards, deals and shows.</p>
          <a
            :href="site.instagramUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-5 inline-flex min-h-11 max-w-full items-center gap-3 font-display text-[clamp(1.875rem,7vw,3.25rem)] leading-none font-bold break-all text-white hover:text-nc-red sm:break-normal"
          >
            <IconInstagram class="h-[0.8em] w-[0.8em] shrink-0 text-nc-red" />
            <span>{{ site.handle }}</span>
            <span class="sr-only">(opens on Instagram in a new tab)</span>
          </a>
        </div>
      </div>

      <ul role="list" class="mt-10 grid border-t border-white/15 sm:grid-cols-3 sm:gap-6 sm:border-t-0">
        <li v-for="r in reasons" :key="r.title" class="border-b border-white/15 sm:border-t sm:border-b-0">
          <a
            :href="r.to === 'instagram' ? site.instagramUrl : site.onTreasureUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex items-start justify-between gap-4 py-4 sm:block sm:pt-5"
          >
            <span>
              <span class="block font-display text-2xl font-bold">{{ r.title }}</span>
              <span class="mt-1 block text-[0.9375rem] text-white/70">{{ r.body }}</span>
            </span>
            <span aria-hidden="true" class="mt-1 text-xl text-nc-red transition-transform group-hover:translate-x-1 sm:mt-3 sm:inline-block">→</span>
            <span class="sr-only">
              ({{ r.to === 'instagram' ? `opens ${site.handle} on Instagram` : 'opens Nino’s OnTreasure profile' }} in a new tab)
            </span>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
