<script setup lang="ts">
import { logo } from '~/data/media'

withDefaults(defineProps<{ size?: 'sm' | 'lg' }>(), { size: 'sm' })
</script>

<template>
  <span class="inline-flex items-center gap-3">
    <picture>
      <source :srcset="logo.src" type="image/webp">
      <img
        :src="logo.fallback"
        :alt="logo.alt"
        width="150"
        height="150"
        :class="[
          'shrink-0 rounded-full ring-1 ring-white/15',
          size === 'lg' ? 'h-16 w-16' : 'h-10 w-10',
        ]"
      >
    </picture>
    <span class="font-display text-lg leading-none tracking-wide text-white uppercase">
      Nino’s <span class="text-nc-red">Collectibles</span>
    </span>
  </span>
</template>
