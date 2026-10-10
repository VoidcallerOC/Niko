<script setup lang="ts">
import type { IgPhoto } from '~/data/media'

const props = withDefaults(
  defineProps<{
    photo: IgPhoto
    /** `sizes` attribute for responsive selection. */
    sizes?: string
    eager?: boolean
  }>(),
  { sizes: '100vw', eager: false },
)

const largest = computed(() => props.photo.widths[props.photo.widths.length - 1]!)
const srcset = computed(() =>
  props.photo.widths.map((w) => `${props.photo.base}-${w}.webp ${w}w`).join(', '),
)
</script>

<template>
  <img
    :src="`${photo.base}-${largest}.webp`"
    :srcset="srcset"
    :sizes="sizes"
    :width="largest"
    :height="Math.round(largest / photo.ratio)"
    :alt="photo.alt"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="eager ? 'high' : undefined"
    decoding="async"
  >
</template>
