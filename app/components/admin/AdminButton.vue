<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'red' | 'white' | 'outline' | 'quiet' | 'danger'
    size?: 'md' | 'lg' | 'sm'
    type?: 'button' | 'submit'
    to?: string
    block?: boolean
    disabled?: boolean
    busy?: boolean
  }>(),
  { variant: 'outline', size: 'md', type: 'button', to: undefined, block: false, disabled: false, busy: false },
)

const variants = {
  red: 'bg-nc-red text-white hover:bg-nc-red-dark',
  white: 'bg-white text-nc-ink hover:bg-white/85',
  outline: 'text-white ring-1 ring-inset ring-white/35 hover:bg-white/10',
  quiet: 'text-white/80 hover:bg-white/10 hover:text-white',
  danger: 'text-nc-red-bright ring-1 ring-inset ring-nc-red/50 hover:bg-nc-red/15',
}
const sizes = { sm: 'min-h-11 px-3 text-sm', md: 'min-h-12 px-4 text-[0.9375rem]', lg: 'min-h-14 px-5 text-base' }
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors"
    :class="[variants[variant], sizes[size], block ? 'w-full' : '']"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="disabled || busy"
    :aria-busy="busy || undefined"
    class="inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    :class="[variants[variant], sizes[size], block ? 'w-full' : '']"
  >
    <span v-if="busy" aria-hidden="true" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    <slot />
  </button>
</template>
