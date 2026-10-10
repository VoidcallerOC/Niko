<script setup lang="ts">
import { navLinks, site } from '~/data/site'
</script>

<template>
  <footer class="bg-nc-ink text-white/70">
    <div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
      <div>
        <BrandMark size="lg" />
        <p class="mt-4 max-w-sm text-sm">Trading cards, bought and sold by Nino. Pokémon, One Piece and more.</p>
      </div>
      <nav aria-label="Footer">
        <ul class="flex flex-wrap gap-x-6 gap-y-3">
          <li v-for="link in navLinks" :key="link.href">
            <a :href="link.href" class="meta inline-flex min-h-11 items-center hover:text-white">{{ link.label }}</a>
          </li>
          <li>
            <a :href="site.instagramUrl" target="_blank" rel="noopener noreferrer" class="meta inline-flex min-h-11 items-center hover:text-white">
              Instagram<span class="sr-only"> (opens {{ site.handle }} in a new tab)</span>
            </a>
          </li>
          <li>
            <a :href="site.onTreasureUrl" target="_blank" rel="noopener noreferrer" class="meta inline-flex min-h-11 items-center hover:text-white">
              OnTreasure<span class="sr-only"> (opens Nino’s vendor profile in a new tab)</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
    <div class="border-t border-white/10">
      <p class="mx-auto max-w-7xl px-4 py-5 text-xs leading-relaxed text-white/45 sm:px-6">
        Preview build. Photos and captions are from {{ site.handle }}’s public Instagram posts; cards
        shown are from past posts and are not a list of current stock. Not affiliated with Instagram,
        Whatnot, OnTreasure, The Pokémon Company, Bandai or Shueisha.
      </p>
    </div>
  </footer>
</template>
