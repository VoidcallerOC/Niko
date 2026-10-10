<script setup lang="ts">
defineProps<{ title?: string; intro?: string }>()
</script>

<template>
  <section class="min-w-0 rounded-lg border border-nc-rule bg-nc-coal/80 p-4 sm:p-6">
    <div v-if="title" class="mb-4">
      <h2 class="font-display text-2xl font-bold">{{ title }}</h2>
      <p v-if="intro" class="mt-1 text-sm text-nc-mist">{{ intro }}</p>
    </div>
    <slot />
  </section>
</template>
