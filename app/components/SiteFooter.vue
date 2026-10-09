<script setup lang="ts">
import { navLinks, site } from '~/data/site'
</script>

<template>
  <footer class="bg-nc-black text-white/75">
    <div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
      <div>
        <BrandMark inverted />
        <p class="mt-3 text-sm">Trading cards, bought &amp; sold. Find everything current on Instagram.</p>
      </div>
      <nav aria-label="Footer">
        <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <li v-for="link in navLinks" :key="link.href">
            <a :href="link.href" class="hover:text-white">{{ link.label }}</a>
          </li>
          <li>
            <a :href="site.instagramUrl" target="_blank" rel="noopener noreferrer" class="hover:text-white">
              Instagram<span class="sr-only"> (opens {{ site.handle }} in a new tab)</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
    <div class="border-t border-white/10">
      <p class="mx-auto max-w-6xl px-4 py-4 text-xs text-white/50 sm:px-6">
        Homepage concept preview for {{ site.name }} ({{ site.handle }}). Not affiliated with
        Instagram, Whatnot, The Pokémon Company or Bandai. All trademarks belong to their owners.
      </p>
    </div>
  </footer>
</template>
