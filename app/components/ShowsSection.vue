<script setup lang="ts">
import { photos } from '~/data/media'
import { site } from '~/data/site'

const table = photos.tableDeals
</script>

<template>
  <section id="shows" aria-labelledby="shows-title" class="bg-nc-bone">
    <div class="mx-auto grid max-w-7xl lg:grid-cols-12">
      <figure class="relative lg:col-span-7">
        <IgImage
          :photo="table"
          sizes="(min-width: 1024px) 58vw, 100vw"
          class="aspect-[4/3] w-full object-cover object-[50%_70%] lg:aspect-auto lg:h-full"
        />
        <figcaption class="meta absolute bottom-3 left-3 bg-nc-bone px-2.5 py-1.5 text-nc-ink">
          “{{ table.caption }}” · {{ formatPostDate(table.postDate) }}
        </figcaption>
      </figure>

      <div class="flex flex-col justify-center px-4 py-12 sm:px-6 lg:col-span-5 lg:px-12 lg:py-24">
        <p class="meta text-nc-red">02 — Vending events</p>
        <h2 id="shows-title" class="mt-3 font-display text-5xl leading-[0.9] uppercase sm:text-6xl">
          Find Nino <br>at a show.
        </h2>
        <p class="mt-5 text-lg leading-relaxed text-nc-muted">
          Nino sets up at card shows. Look for the black <span class="font-semibold text-nc-ink">Nino’s
          Collectibles</span> banner on the table. The shows he’s vending are listed on his
          OnTreasure profile.
        </p>

        <LinkButton to="ontreasure" size="lg" class="mt-8 self-stretch sm:self-start">
          Find Nino at a show
        </LinkButton>
        <p class="meta mt-4 text-nc-muted">
          Opens ontreasure.com/u/ninoscollectibles · check there for dates
        </p>

        <blockquote class="mt-10 border-l-4 border-nc-red pl-4">
          <p class="text-base leading-snug">“{{ photos.vendorSolo.caption }}”</p>
          <footer class="meta mt-2 text-nc-muted">
            {{ site.handle }} · {{ formatPostDate(photos.vendorSolo.postDate) }}
          </footer>
        </blockquote>
      </div>
    </div>
  </section>
</template>
