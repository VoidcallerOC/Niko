<script setup lang="ts">
import { media } from '~/data/media'
import { site } from '~/data/site'
</script>

<template>
  <section id="about" aria-labelledby="about-title" class="border-y border-nc-line bg-white">
    <div class="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
      <div class="grid grid-cols-2 gap-4">
        <MediaSlot :item="media.about[0]!" aspect="aspect-[3/4]" />
        <MediaSlot :item="media.about[1]!" aspect="aspect-[3/4]" class="mt-10" />
      </div>

      <div>
        <p class="eyebrow">About Nino</p>
        <h2 id="about-title" class="mt-3 font-display text-3xl leading-tight text-nc-black uppercase sm:text-5xl">
          A collector behind the counter.
        </h2>
        <div class="mt-5 space-y-4 text-lg text-nc-ink/85">
          <p>
            Behind {{ site.handle }} is Nino. Nino’s Collectibles is a personal card business:
            buying and selling, ripping packs, and working the table at card events.
          </p>
          <p>
            The feed says it best: card deals, pack openings, vendor tables and real excitement
            about what just got pulled. If you’re into the hobby, you’ll feel right at home.
          </p>
        </div>
        <InstagramButton variant="outline" class="mt-8">Follow along on Instagram</InstagramButton>
      </div>
    </div>
  </section>
</template>
