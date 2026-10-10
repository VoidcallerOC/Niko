<script setup lang="ts">
import { navLinks } from '~/data/site'
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-white/10 bg-nc-ink/95 text-white backdrop-blur">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
      <a href="#top" class="min-w-0 rounded-md" aria-label="Nino’s Collectibles, back to top">
        <BrandMark />
      </a>

      <nav aria-label="Primary" class="hidden lg:block">
        <ul class="flex items-center gap-7 text-[0.9375rem] font-medium">
          <li v-for="link in navLinks" :key="link.href">
            <a :href="link.href" class="inline-flex min-h-11 items-center text-white/70 transition-colors hover:text-white">
              {{ link.label }}
            </a>
          </li>
        </ul>
      </nav>

      <LinkButton to="instagram" class="shrink-0">
        <span class="sm:hidden">DM</span><span class="hidden sm:inline">Message Nino</span>
      </LinkButton>
    </div>
  </header>
</template>
