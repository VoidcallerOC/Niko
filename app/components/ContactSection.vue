<script setup lang="ts">
import { site } from '~/data/site'

const reasons = [
  { title: 'Want a card?', body: 'DM about a card or a deal you saw in a post.' },
  { title: 'Selling cards?', body: 'Send photos of what you have.' },
  { title: 'Next show or live?', body: 'Check the latest posts and stories.' },
] as const
</script>

<template>
  <section id="contact" aria-labelledby="contact-title" class="bg-nc-red text-white">
    <div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div class="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p class="text-xs font-bold tracking-[0.2em] text-white/80 uppercase">Contact</p>
          <h2 id="contact-title" class="mt-3 font-display text-4xl leading-[0.95] uppercase sm:text-6xl">
            Slide into<br>the DMs.
          </h2>
          <p class="mt-5 max-w-lg text-lg text-white/90">
            Instagram is where to reach Nino — for cards, deals, selling your collection, and
            what’s coming up next.
          </p>
          <div class="mt-8 flex flex-col items-start gap-3">
            <InstagramButton variant="dark" size="lg">Message {{ site.handle }}</InstagramButton>
            <a
              :href="site.instagramUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm font-medium break-all text-white/90 underline underline-offset-4 hover:text-white"
            >
              instagram.com/ninoscollectibles<span class="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>

        <ul class="grid gap-3" role="list">
          <li
            v-for="reason in reasons"
            :key="reason.title"
            class="rounded-2xl border border-white/25 bg-white/10 p-5"
          >
            <p class="font-display text-lg uppercase">{{ reason.title }}</p>
            <p class="mt-1 text-white/90">{{ reason.body }}</p>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
