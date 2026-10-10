<script setup lang="ts">
import { photos } from '~/data/media'
import { site } from '~/data/site'
</script>

<template>
  <section id="about" aria-labelledby="about-title" class="bg-nc-ink">
    <div class="mx-auto grid max-w-5xl items-center gap-8 px-4 py-14 sm:grid-cols-[auto_1fr] sm:gap-12 sm:px-6 lg:gap-16 lg:py-20">
      <ReelEmbed :reel="photos.reelHeat" class="order-2 sm:order-1" />

      <div class="order-1 sm:order-2">
        <p class="eyebrow">About Nino</p>
        <h2 id="about-title" class="mt-3 text-title">The guy behind the table</h2>
        <div class="mt-4 max-w-prose space-y-3 text-nc-mist sm:text-lede">
          <p>
            On Instagram he’s just <strong class="font-semibold text-white">NINO</strong>, filed under
            “Buying and Selling.” The feed is One Piece and Pokémon cards, card shows, pack rips and the
            odd Naruto card at Yankee Stadium.
          </p>
          <p>He doesn’t always pull the big one himself: “Wifey pulling heat last night!!!!”</p>
        </div>
        <LinkButton to="instagram" variant="outline-light" class="mt-6">Follow {{ site.handle }}</LinkButton>
      </div>
    </div>
  </section>
</template>
