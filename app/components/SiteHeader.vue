<script setup lang="ts">
import { navLinks, site } from '~/data/site'

/*
 * Desktop (lg+): inline nav between the brand and the Instagram button.
 * Below lg: a "Menu" button toggles a dropdown panel. The panel closes on
 * link choice, Escape, a click outside, or when the viewport grows to lg.
 */
const open = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const menuId = 'site-menu'

function close(returnFocus = false) {
  if (!open.value) return
  open.value = false
  if (returnFocus) menuButton.value?.focus()
}

function toggle() {
  open.value = !open.value
  if (open.value) nextTick(() => panel.value?.querySelector<HTMLElement>('a')?.focus())
}

onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close(true)
  }
  const onPointer = (e: PointerEvent) => {
    const t = e.target as Node
    if (open.value && !panel.value?.contains(t) && !menuButton.value?.contains(t)) close()
  }
  const desktop = window.matchMedia('(min-width: 64rem)')
  const onDesktop = () => {
    if (desktop.matches) close()
  }
  document.addEventListener('keydown', onKey)
  document.addEventListener('pointerdown', onPointer)
  desktop.addEventListener('change', onDesktop)
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKey)
    document.removeEventListener('pointerdown', onPointer)
    desktop.removeEventListener('change', onDesktop)
  })
})
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-white/10 bg-nc-ink/95 text-white backdrop-blur">
    <div class="wrap flex h-16 items-center justify-between gap-3">
      <a href="/#top" class="min-w-0 rounded-md" aria-label="Nino’s Collectibles home">
        <BrandMark />
      </a>

      <nav aria-label="Primary" class="hidden lg:block">
        <ul class="flex items-center gap-2 text-[0.9375rem] font-medium">
          <li v-for="link in navLinks" :key="link.href">
            <a :href="link.href" class="nav-link">{{ link.label }}</a>
          </li>
        </ul>
      </nav>

      <div class="flex shrink-0 items-center gap-2">
        <LinkButton to="instagram" icon-only-on-phone>
          <span class="sr-only sm:not-sr-only">Message Nino</span>
        </LinkButton>
        <button
          ref="menuButton"
          type="button"
          class="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2.5 text-[0.9375rem] font-semibold text-white ring-1 ring-inset ring-white/35 transition-colors hover:bg-white/10 lg:hidden"
          :aria-expanded="open"
          :aria-controls="menuId"
          @click="toggle"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path v-if="!open" d="M4 7h16M4 12h16M4 17h16" />
            <path v-else d="M6 6l12 12M18 6 6 18" />
          </svg>
          <span class="hidden min-[400px]:inline">{{ open ? 'Close' : 'Menu' }}</span>
          <span class="sr-only">{{ open ? 'Close menu' : 'Open menu' }}</span>
        </button>
      </div>
    </div>

    <!-- Mobile menu panel -->
    <nav
      v-show="open"
      :id="menuId"
      ref="panel"
      aria-label="Primary"
      class="absolute inset-x-0 top-full border-b border-white/10 bg-nc-ink/98 shadow-[0_24px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur lg:hidden"
      data-mobile-menu
    >
      <ul class="wrap divide-y divide-white/10 py-2">
        <li v-for="link in navLinks" :key="link.href">
          <a :href="link.href" class="flex min-h-12 items-center text-lg font-medium text-white/85 hover:text-white" @click="close()">
            {{ link.label }}
          </a>
        </li>
        <li>
          <a
            :href="site.onTreasureUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex min-h-12 items-center gap-2 text-lg font-medium text-white/85 hover:text-white"
            @click="close()"
          >
            Find Nino at a show
            <svg aria-hidden="true" viewBox="0 0 16 16" class="h-3.5 w-3.5 opacity-70" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 11 11 5M6 5h5v5" /></svg>
            <span class="sr-only">(opens Nino’s OnTreasure vendor profile in a new tab)</span>
          </a>
        </li>
      </ul>
    </nav>
  </header>
</template>
