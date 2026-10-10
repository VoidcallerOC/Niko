<script setup lang="ts">
/**
 * Admin shell. Red/black/white like the public site, but quieter: one top bar,
 * a scrollable section nav, and on phones a fixed bar with the show-day
 * actions (Scan, Add, Inventory, Events). Nav layout follows the Infinite
 * Heroes protected layout (sidebar sections + sign-out form) rearranged for
 * one-handed phone use.
 */
const route = useRoute()
const { toasts, dismiss } = useAdminToast()
const { call } = useAdminApi()

const sections = [
  { to: '/admin', label: 'Dashboard', exact: true },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/scan', label: 'Scan' },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/instagram', label: 'Instagram' },
  { to: '/admin/square', label: 'Square' },
  { to: '/admin/settings', label: 'Settings' },
]
const quick = [
  { to: '/admin/scan', label: 'Scan', icon: 'M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M4 12h16' },
  { to: '/admin/inventory/new', label: 'Add', icon: 'M12 5v14M5 12h14' },
  { to: '/admin/inventory', label: 'Cards', icon: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/admin/events', label: 'Events', icon: 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4' },
]
const active = (to: string, exact = false) => (exact ? route.path === to : route.path === to || route.path.startsWith(to + '/'))

const { data: session } = await useAsyncData('admin-session', () => useRequestFetch()<{ signedIn: boolean; demo: boolean }>('/api/admin/auth/session'))

async function signOut() {
  await call('/api/admin/auth/logout')
  await navigateTo('/admin/login')
}

useHead({ title: 'Admin — Nino’s Collectibles', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>

<template>
  <div class="min-h-svh bg-nc-ink text-white">
    <a href="#admin-main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-nc-ink">Skip to content</a>

    <header class="sticky top-0 z-40 border-b border-white/10 bg-nc-ink/95 backdrop-blur">
      <div class="wrap flex h-14 items-center justify-between gap-3">
        <NuxtLink to="/admin" class="flex min-h-11 min-w-0 items-center gap-2 rounded-md" aria-label="Admin home">
          <BrandMark />
          <span class="hidden rounded-sm bg-white/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-white/80 uppercase sm:inline">Admin</span>
        </NuxtLink>
        <div class="flex items-center gap-2">
          <span v-if="session?.demo" class="hidden rounded-sm bg-nc-red px-2 py-1 text-xs font-bold tracking-wide whitespace-nowrap text-white uppercase md:inline">Demo · sample data</span>
          <NuxtLink to="/" class="nav-link hidden sm:inline-flex">View site</NuxtLink>
          <button type="button" class="nav-link whitespace-nowrap" @click="signOut">Sign out</button>
        </div>
      </div>
      <nav aria-label="Admin sections" class="wrap -mb-px overflow-x-auto [scrollbar-width:none]">
        <ul class="flex gap-1 whitespace-nowrap">
          <li v-for="s in sections" :key="s.to">
            <NuxtLink
              :to="s.to"
              class="inline-flex min-h-11 items-center border-b-2 px-3 text-[0.9375rem] font-medium"
              :class="active(s.to, s.exact) ? 'border-nc-red text-white' : 'border-transparent text-white/60 hover:text-white'"
              :aria-current="active(s.to, s.exact) ? 'page' : undefined"
            >{{ s.label }}</NuxtLink>
          </li>
        </ul>
      </nav>
    </header>

    <main id="admin-main" tabindex="-1" class="wrap pt-6 pb-28 sm:pb-16">
      <div v-if="session?.demo" class="mb-5 rounded-md border border-nc-red/60 bg-nc-red/10 px-4 py-3 text-sm text-white/90">
        <strong>Demo mode.</strong> Everything here is labelled SAMPLE data for previewing the interface. It is not Nino’s inventory, pricing, sales or schedule.
      </div>
      <slot />
    </main>

    <!-- Phone: show-day actions -->
    <nav aria-label="Quick actions" class="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-nc-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul class="grid grid-cols-4">
        <li v-for="q in quick" :key="q.to">
          <NuxtLink :to="q.to" class="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold" :class="active(q.to, true) ? 'text-nc-red-bright' : 'text-white/75'">
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="q.icon" /></svg>
            {{ q.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <!-- Feedback -->
    <div aria-live="polite" class="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-4 sm:top-auto sm:bottom-6">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex min-h-12 w-full max-w-md items-center justify-between gap-3 rounded-md px-4 py-3 text-[0.9375rem] font-semibold shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]"
        :class="t.kind === 'error' ? 'bg-nc-red text-white' : t.kind === 'saved' ? 'bg-white text-nc-ink' : 'bg-nc-char text-white'"
        role="status"
      >
        <span>{{ t.text }}</span>
        <button type="button" class="-mr-2 min-h-11 min-w-11 rounded-md" aria-label="Dismiss" @click="dismiss(t.id)">×</button>
      </div>
    </div>
  </div>
</template>
