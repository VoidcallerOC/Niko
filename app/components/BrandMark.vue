<script setup lang="ts">
import { media } from '~/data/media'

withDefaults(defineProps<{ inverted?: boolean }>(), { inverted: false })
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <img
      v-if="media.logo.src"
      :src="media.logo.src"
      :alt="media.logo.alt"
      class="h-10 w-10 rounded-full object-cover"
    >
    <!-- Typographic stand-in for the NC logo until the real file is added. -->
    <span
      v-else
      aria-hidden="true"
      class="grid h-10 w-10 place-items-center rounded-full bg-nc-red font-display text-sm tracking-tight text-white ring-2 ring-nc-black"
      title="Stand-in mark — replace with the real NC logo"
    >
      NC
    </span>
    <span
      :class="[
        'font-display text-lg leading-none tracking-tight',
        inverted ? 'text-white' : 'text-nc-black',
      ]"
    >
      Nino’s<span class="text-nc-red"> Collectibles</span>
    </span>
  </span>
</template>
