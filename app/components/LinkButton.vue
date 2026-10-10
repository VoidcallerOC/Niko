<script setup lang="ts">
import { site } from '~/data/site'

const props = withDefaults(
  defineProps<{
    to: 'instagram' | 'ontreasure' | string
    variant?: 'red' | 'ink' | 'white' | 'outline-light' | 'outline-ink'
    size?: 'md' | 'lg'
    /** Stretch to the container width on phones. */
    block?: boolean
  }>(),
  { variant: 'red', size: 'md', block: false },
)

const href = computed(() =>
  props.to === 'instagram'
    ? site.instagramUrl
    : props.to === 'ontreasure'
      ? site.onTreasureUrl
      : props.to,
)
const external = computed(() => /^https?:/.test(href.value))
const srNote = computed(() =>
  props.to === 'instagram'
    ? `(opens ${site.handle} on Instagram in a new tab)`
    : props.to === 'ontreasure'
      ? '(opens Nino’s OnTreasure vendor profile in a new tab)'
      : external.value
        ? '(opens in a new tab)'
        : '',
)

const variants = {
  red: 'bg-nc-red text-white hover:bg-nc-red-dark',
  ink: 'bg-nc-ink text-white hover:bg-black',
  white: 'bg-white text-nc-ink hover:bg-nc-paper',
  'outline-light': 'text-white ring-2 ring-inset ring-white/70 hover:bg-white hover:text-nc-ink',
  'outline-ink': 'text-nc-ink ring-2 ring-inset ring-nc-ink hover:bg-nc-ink hover:text-white',
} as const
const sizes = {
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-14 px-7 text-base',
} as const
</script>

<template>
  <a
    :href="href"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    :class="[
      'group inline-flex items-center justify-center gap-2.5 rounded-sm font-semibold tracking-wide uppercase transition-colors',
      variants[variant],
      sizes[size],
      block ? 'w-full sm:w-auto' : '',
    ]"
  >
    <IconInstagram v-if="to === 'instagram'" class="h-[1.15em] w-[1.15em] shrink-0" />
    <span><slot /></span>
    <svg
      v-if="external"
      aria-hidden="true"
      viewBox="0 0 16 16"
      class="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M5 11 11 5M6 5h5v5" />
    </svg>
    <span v-if="srNote" class="sr-only">{{ srNote }}</span>
  </a>
</template>
