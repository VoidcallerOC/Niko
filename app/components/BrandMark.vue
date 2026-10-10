<script setup lang="ts">
import { logo } from '~/data/media'

withDefaults(defineProps<{ variant?: 'emblem' | 'full' }>(), { variant: 'emblem' })
</script>

<template>
  <picture v-if="variant === 'full'">
    <source :srcset="logo.full.srcset" sizes="14rem" type="image/webp">
    <img :src="logo.full.fallback" :alt="logo.fullAlt" width="640" height="640" class="h-full w-full">
  </picture>
  <span v-else class="inline-flex items-center gap-2">
    <picture class="shrink-0">
      <source :srcset="logo.emblem.srcset" sizes="3rem" type="image/webp">
      <img :src="logo.emblem.fallback" :alt="logo.alt" width="256" height="256" class="h-11 w-11 shrink-0">
    </picture>
    <span class="hidden font-display text-xl leading-none font-bold tracking-wide whitespace-nowrap text-white uppercase min-[360px]:inline">
      Nino’s <span class="text-nc-red">Collectibles</span>
    </span>
  </span>
</template>
