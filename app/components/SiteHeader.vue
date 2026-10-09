<script setup lang="ts">
import { navLinks } from '~/data/site'
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-nc-line bg-nc-paper/90 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <a href="#top" class="min-w-0 rounded-full" aria-label="Nino’s Collectibles — back to top">
        <BrandMark />
      </a>

      <nav aria-label="Primary" class="hidden md:block">
        <ul class="flex items-center gap-7 text-sm font-semibold">
          <li v-for="link in navLinks" :key="link.href">
            <a :href="link.href" class="transition-colors hover:text-nc-red">{{ link.label }}</a>
          </li>
        </ul>
      </nav>

      <div class="shrink-0">
        <span class="hidden sm:block">
          <InstagramButton>Message on Instagram</InstagramButton>
        </span>
        <span class="sm:hidden">
          <InstagramButton variant="dark">DM</InstagramButton>
        </span>
      </div>
    </div>

    <nav aria-label="Sections" class="border-t border-nc-line md:hidden">
      <ul class="mx-auto flex max-w-6xl justify-between gap-2 overflow-x-auto px-4 py-2 text-sm font-semibold">
        <li v-for="link in navLinks" :key="link.href">
          <a :href="link.href" class="block whitespace-nowrap px-1 py-1 hover:text-nc-red">{{ link.label }}</a>
        </li>
      </ul>
    </nav>
  </header>
</template>
