<script setup lang="ts">
import { site } from '~/data/site'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'dark' | 'light' | 'outline' | 'outline-light'
    size?: 'md' | 'lg'
  }>(),
  { variant: 'primary', size: 'md' },
)

const variants = {
  primary: 'bg-nc-red text-white hover:bg-nc-red-dark',
  dark: 'bg-nc-black text-white hover:bg-nc-ink',
  light: 'bg-white text-nc-black hover:bg-nc-paper',
  outline: 'border-2 border-nc-black text-nc-black hover:bg-nc-black hover:text-white',
  'outline-light': 'border-2 border-white/80 text-white hover:bg-white hover:text-nc-black',
} as const

const sizes = {
  md: 'px-5 py-3 text-sm',
  lg: 'px-7 py-4 text-base',
} as const
</script>

<template>
  <a
    :href="site.instagramUrl"
    target="_blank"
    rel="noopener noreferrer"
    :class="[
      'inline-flex max-w-full items-center justify-center gap-2 rounded-full text-center font-semibold transition-colors',
      variants[variant],
      sizes[size],
    ]"
  >
    <IconInstagram class="h-[1.15em] w-[1.15em] shrink-0" />
    <span><slot /></span>
    <span class="sr-only">(opens {{ site.handle }} on Instagram in a new tab)</span>
  </a>
</template>
