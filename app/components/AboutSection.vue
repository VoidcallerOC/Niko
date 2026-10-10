<script setup lang="ts">
import { logo, photos } from '~/data/media'
import { site } from '~/data/site'

const reel = photos.reelHeat
</script>

<template>
  <section id="about" aria-labelledby="about-title" class="bg-nc-paper">
    <div class="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-12 lg:py-24">
      <div class="md:col-span-7">
        <p class="meta text-nc-red">04 — About Nino</p>
        <h2 id="about-title" class="mt-3 font-display text-5xl leading-[0.9] uppercase sm:text-7xl">
          The guy <br>behind the table.
        </h2>
        <div class="mt-6 max-w-xl space-y-4 text-lg leading-relaxed text-nc-muted">
          <p>
            On Instagram he’s just <span class="font-semibold text-nc-ink">NINO</span>, and the
            category says <span class="font-semibold text-nc-ink">Buying and Selling</span>. The feed
            is One Piece and Pokémon cards, card shows, pack rips and the odd Naruto card at Yankee
            Stadium.
          </p>
          <p>
            He doesn’t always pull the big one himself: “Wifey pulling heat last night!!!!”
          </p>
        </div>
        <LinkButton to="instagram" variant="outline-ink" class="mt-8">Follow {{ site.handle }}</LinkButton>
      </div>

      <div class="relative mx-auto w-full max-w-xs md:col-span-5 md:max-w-sm">
        <figure class="relative">
          <IgImage
            :photo="reel"
            sizes="(min-width: 768px) 24rem, 80vw"
            class="aspect-[9/16] w-full object-cover shadow-[12px_12px_0_0_var(--color-nc-ink)]"
          />
          <figcaption class="mt-5 text-sm leading-snug">
            “{{ reel.caption }}”
            <span class="meta mt-1 block text-nc-muted">From Nino’s reel · {{ formatPostDate(reel.postDate) }}</span>
          </figcaption>
        </figure>
        <picture>
          <source :srcset="logo.src" type="image/webp">
          <img
            :src="logo.fallback"
            alt=""
            width="150"
            height="150"
            class="absolute -top-6 -left-6 h-24 w-24 rounded-full ring-4 ring-nc-paper sm:h-28 sm:w-28"
          >
        </picture>
      </div>
    </div>
  </section>
</template>
