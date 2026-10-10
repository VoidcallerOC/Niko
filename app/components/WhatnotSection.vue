<script setup lang="ts">
import { photos } from '~/data/media'

const lunch = photos.whatnotLunch
</script>

<template>
  <section id="live" aria-labelledby="live-title" class="bg-nc-ink text-white">
    <div class="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-12 lg:py-20">
      <div class="md:order-2 md:col-span-7 lg:col-span-6 lg:col-start-6">
        <p class="meta text-nc-red">03 — Whatnot &amp; updates</p>
        <h2 id="live-title" class="mt-3 font-display text-5xl leading-[0.9] uppercase sm:text-6xl">
          Catch the <br>next live.
        </h2>
        <p class="mt-5 max-w-lg text-lg leading-relaxed text-white/75">
          Nino has run shows on Whatnot, including a lunch show in September. Times and links for the
          next one go up on his Instagram, so follow him there for live dates and new posts.
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <LinkButton to="instagram" size="lg" variant="white" block>Get updates on Instagram</LinkButton>
        </div>
      </div>

      <figure class="md:order-1 md:col-span-5 lg:col-span-4">
        <div class="relative">
          <span aria-hidden="true" class="absolute -inset-2 -z-0 -rotate-2 bg-nc-red" />
          <IgImage
            :photo="lunch"
            sizes="(min-width: 768px) 35vw, 90vw"
            class="relative aspect-[4/5] w-full object-cover"
          />
        </div>
        <figcaption class="meta mt-4 text-white/55">
          From a Whatnot lunch-show post · {{ formatPostDate(lunch.postDate) }}
        </figcaption>
      </figure>
    </div>
  </section>
</template>
