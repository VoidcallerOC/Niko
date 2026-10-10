<script setup lang="ts">
import { navLinks, site } from '~/data/site'
</script>

<template>
  <footer class="border-t border-white/10 bg-nc-ink text-white/65">
    <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
      <nav aria-label="Footer">
        <ul class="flex flex-wrap gap-x-5 text-sm font-medium">
          <li v-for="link in navLinks" :key="link.href">
            <a :href="link.href" class="inline-flex min-h-11 items-center hover:text-white">{{ link.label }}</a>
          </li>
          <li>
            <a :href="site.instagramUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center hover:text-white">
              Instagram<span class="sr-only"> (opens {{ site.handle }} in a new tab)</span>
            </a>
          </li>
          <li>
            <a :href="site.onTreasureUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center hover:text-white">
              OnTreasure<span class="sr-only"> (opens Nino’s vendor profile in a new tab)</span>
            </a>
          </li>
        </ul>
      </nav>
      <p class="text-sm">© {{ site.name }}</p>
    </div>
    <div class="border-t border-white/10">
      <p class="mx-auto max-w-7xl px-4 py-5 text-caption text-white/45 sm:px-6">
        Concept preview. Photos and captions are from {{ site.handle }}’s public Instagram posts; cards
        shown are from past posts and are not a list of current stock. Not affiliated with Instagram,
        Whatnot, OnTreasure, The Pokémon Company, Bandai or Shueisha.
      </p>
    </div>
  </footer>
</template>
