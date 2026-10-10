<script setup lang="ts">
defineProps<{ eyebrow?: string; title: string; intro?: string }>()
</script>

<template>
  <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="max-w-2xl">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1 class="mt-1 font-display text-4xl font-bold sm:text-5xl">{{ title }}</h1>
      <p v-if="intro" class="mt-2 text-[0.9375rem] text-nc-mist">{{ intro }}</p>
    </div>
    <div v-if="$slots.default" class="flex shrink-0 flex-wrap gap-2"><slot /></div>
  </header>
</template>
