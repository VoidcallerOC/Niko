<script setup lang="ts">
import type { IgPhoto } from '~/data/media'

defineProps<{ photo: IgPhoto }>()
</script>

<template>
  <figcaption class="mt-2.5">
    <p class="text-[0.9375rem] leading-snug font-medium text-nc-ink">“{{ photo.caption }}”</p>
    <p class="mt-1 text-caption text-nc-muted">
      <span v-if="photo.tag" class="font-semibold text-nc-red-dark">{{ photo.tag }}</span>
      <span v-if="photo.tag" aria-hidden="true"> · </span>{{ formatPostDate(photo.postDate) }}
    </p>
  </figcaption>
</template>
