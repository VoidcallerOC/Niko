<script setup lang="ts">
import type { MediaItem } from '~/data/media'
import { site } from '~/data/site'

const props = withDefaults(
  defineProps<{
    item: MediaItem
    /** Tailwind aspect-ratio class, e.g. `aspect-[4/5]`. */
    aspect?: string
    /** Use the darker placeholder treatment on dark sections. */
    dark?: boolean
    eager?: boolean
  }>(),
  { aspect: 'aspect-[4/5]', dark: false, eager: false },
)

const placeholderLabel = computed(() => `Photo placeholder: ${props.item.label}`)
</script>

<template>
  <figure :class="['relative overflow-hidden rounded-2xl', aspect]">
    <img
      v-if="item.src"
      :src="item.src"
      :alt="item.alt"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      class="h-full w-full object-cover"
    >
    <div
      v-else
      role="img"
      :aria-label="placeholderLabel"
      :class="[
        'flex h-full w-full flex-col items-center justify-center gap-3 border-2 border-dashed p-5 text-center',
        dark
          ? 'border-white/25 bg-white/5 text-white/70'
          : 'border-nc-black/20 bg-[repeating-linear-gradient(135deg,#ece8e1_0_12px,#f3f0ea_12px_24px)] text-nc-ink/70',
      ]"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        class="h-8 w-8"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <span
        :class="[
          'rounded-full px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.15em] uppercase',
          dark ? 'bg-white text-nc-black' : 'bg-nc-black text-white',
        ]"
      >
        Placeholder
      </span>
      <span class="max-w-[22ch] text-sm leading-snug font-medium">{{ item.label }}</span>
      <span class="text-xs opacity-80">Swap in a photo from {{ site.handle }}</span>
    </div>
  </figure>
</template>
