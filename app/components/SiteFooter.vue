<script setup lang="ts">
import { navLinks, site } from '~/data/site'

// The stock note follows the feed: Square inventory once connected, past posts otherwise.
const { data: squareFeed } = await useSquareFeed()
const fromSquare = computed(() => squareFeed.value.cards.length > 0)
</script>

<template>
  <footer class="border-t border-white/10 bg-nc-ink/80 text-white/65">
    <div class="wrap flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
      <nav aria-label="Footer">
        <ul class="-mx-2 flex flex-wrap gap-x-1 text-sm font-medium">
          <li v-for="link in navLinks" :key="link.href">
            <a :href="link.href" class="inline-flex min-h-11 min-w-11 items-center justify-center px-2 hover:text-white hover:underline">{{ link.label }}</a>
          </li>
          <li>
            <a :href="site.instagramUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center px-2 hover:text-white hover:underline">
              Instagram<span class="sr-only"> (opens {{ site.handle }} in a new tab)</span>
            </a>
          </li>
          <li>
            <a :href="site.onTreasureUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center px-2 hover:text-white hover:underline">
              OnTreasure<span class="sr-only"> (opens Nino’s vendor profile in a new tab)</span>
            </a>
          </li>
        </ul>
      </nav>
      <p class="text-sm">© {{ site.name }}</p>
    </div>
    <div class="border-t border-white/10">
      <p class="wrap py-5 text-caption text-white/45">
        <template v-if="fromSquare">
          Concept preview. Cards in the feed come from Nino’s Square inventory; photos and captions in the
          Instagram posts are from {{ site.handle }}’s public posts. Not affiliated with Instagram, Square,
        </template>
        <template v-else>
          Concept preview. Photos and captions are from {{ site.handle }}’s public Instagram posts; cards
          shown are from past posts and are not a list of current stock. Not affiliated with Instagram,
        </template>
        Whatnot, OnTreasure, The Pokémon Company, Bandai or Shueisha.
      </p>
    </div>
  </footer>
</template>
