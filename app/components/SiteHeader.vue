<script setup lang="ts">
import { navLinks } from '~/data/site'
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-white/10 bg-nc-ink/95 text-white backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
      <a href="#top" class="min-w-0 rounded-full" aria-label="Nino’s Collectibles, back to top">
        <BrandMark />
      </a>

      <nav aria-label="Primary" class="hidden lg:block">
        <ul class="flex items-center gap-8">
          <li v-for="link in navLinks" :key="link.href">
            <a :href="link.href" class="meta inline-flex min-h-11 items-center text-white/75 transition-colors hover:text-white">{{ link.label }}</a>
          </li>
        </ul>
      </nav>

      <div class="flex shrink-0 items-center gap-2">
        <span class="hidden md:block">
          <LinkButton to="ontreasure" variant="outline-light">Shows</LinkButton>
        </span>
        <LinkButton to="instagram">
          <span class="sm:hidden">DM</span><span class="hidden sm:inline">Message Nino</span>
        </LinkButton>
      </div>
    </div>
  </header>
</template>
