<script setup lang="ts">
import { logo } from '~/data/media'

withDefaults(defineProps<{ variant?: 'emblem' | 'full' }>(), { variant: 'emblem' })
</script>

<template>
  <picture v-if="variant === 'full'">
    <source :srcset="logo.full.srcset" sizes="12rem" type="image/webp">
    <img :src="logo.full.fallback" :alt="logo.fullAlt" width="640" height="640" class="h-44 w-44 sm:h-48 sm:w-48">
  </picture>
  <span v-else class="inline-flex items-center gap-2.5">
    <picture>
      <source :srcset="logo.emblem.srcset" sizes="3rem" type="image/webp">
      <img :src="logo.emblem.fallback" :alt="logo.alt" width="256" height="256" class="h-12 w-12 shrink-0">
    </picture>
    <span class="font-display text-lg leading-none tracking-wide text-white uppercase">
      Nino’s <span class="text-nc-red">Collectibles</span>
    </span>
  </span>
</template>
