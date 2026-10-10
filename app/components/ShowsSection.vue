<script setup lang="ts">
import { photos } from '~/data/media'
import { site } from '~/data/site'
import type { TreasureResult } from '~~/server/utils/treasureShows'

const table = photos.tableDeals
const banner = ['Buy', 'Sell', 'Trade', 'Collect'] as const

/*
 * Upcoming shows come from Nino's OnTreasure profile through /api/shows
 * (see server/utils/treasureShows.ts). Rendered on the server so the list is
 * in the HTML; refreshed in the browser every 5 minutes and when the tab
 * comes back, the same way Thousand Sunny's RoadBlock does.
 */
const fallback = (): TreasureResult => ({ status: 'unavailable', shows: [], fetchedAt: '' })
const { data, refresh } = await useAsyncData<TreasureResult>(
  'shows',
  () => $fetch<TreasureResult>('/api/shows' as string),
  { default: fallback },
)

// Events Nino added in the admin (published, not past) join the OnTreasure list.
const { data: siteData } = await useSiteData()
const links = useSiteLinks()
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : iso
}
const manual = computed(() =>
  siteData.value.events.map((e) => ({
    slug: `nc-${e.id}`,
    url: e.url || links.value.onTreasureUrl,
    title: e.title,
    dateLabel: (e.endDate && e.endDate !== e.date ? `${dayLabel(e.date)} – ${dayLabel(e.endDate)}` : dayLabel(e.date)) + (e.hours ? ` · ${e.hours}` : ''),
    startDate: e.date,
    endDate: e.endDate || e.date,
    venue: e.venue,
    city: e.city,
    state: e.state,
    location: [e.venue, [e.city, e.state].filter(Boolean).join(', ')].filter(Boolean).join(' · '),
    poster: '',
    posterAlt: '',
    external: !!e.url,
  })),
)
const shows = computed(() => {
  const urls = new Set(manual.value.map((s) => s.url))
  const treasure = data.value.shows.filter((s) => !urls.has(s.url)).map((s) => ({ ...s, external: true }))
  return [...manual.value, ...treasure].sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0)).slice(0, 6)
})

// Posters that fail to load (removed, blocked) fall back to the NC mark.
const brokenPosters = ref(new Set<string>())
const posterFailed = (slug: string) => brokenPosters.value.add(slug) && (brokenPosters.value = new Set(brokenPosters.value))
const state = computed<'shows' | 'empty' | 'unavailable'>(() =>
  shows.value.length ? 'shows' : data.value.status === 'ok' ? 'empty' : 'unavailable',
)

onMounted(() => {
  const timer = window.setInterval(() => refresh(), 5 * 60 * 1000)
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh()
  }
  document.addEventListener('visibilitychange', onVisible)
  onBeforeUnmount(() => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  })
})

// Event structured data only for events OnTreasure actually returned.
useHead(() => ({
  script: shows.value.length
    ? [
        {
          key: 'ld-events',
          type: 'application/ld+json',
          innerHTML: JSON.stringify(
            shows.value.map((show) => ({
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: show.title,
              startDate: show.startDate,
              endDate: show.endDate,
              eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
              url: show.url,
              ...(show.poster ? { image: show.poster } : {}),
              location: {
                '@type': 'Place',
                name: show.venue || [show.city, show.state].filter(Boolean).join(', ') || 'See event page',
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: show.city,
                  addressRegion: show.state,
                  addressCountry: 'US',
                },
              },
            })),
          ),
        },
      ]
    : [],
}))
</script>

<template>
  <section id="shows" aria-labelledby="shows-title" class="bg-transparent">
    <div class="wrap section-pad">
      <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div class="max-w-xl">
          <p class="eyebrow">Vending events</p>
          <h2 id="shows-title" class="mt-3 text-title">Find Nino at a show</h2>
          <p class="mt-4 text-nc-mist">
            Nino sets up at card shows. These are the ones he’s listed as vending on OnTreasure.
            Check the event page for hours and tickets before you head out.
          </p>
        </div>
        <LinkButton to="ontreasure" size="lg" class="md:shrink-0">All shows on OnTreasure</LinkButton>
      </div>

      <!-- Upcoming shows -->
      <ul v-if="state === 'shows'" role="list" class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6" data-shows>
        <li v-for="show in shows" :key="show.slug">
          <a
            :href="show.url"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex h-full overflow-hidden rounded-md border border-nc-rule bg-nc-char transition-colors hover:border-nc-red sm:flex-col"
          >
            <span class="relative w-[7.5rem] shrink-0 overflow-hidden bg-nc-ink sm:aspect-[4/3] sm:w-auto">
              <span
                aria-hidden="true"
                class="absolute inset-0 grid place-items-center font-display text-3xl font-bold text-nc-rule"
              >NC</span>
              <img
                v-if="show.poster && !brokenPosters.has(show.slug)"
                :src="show.poster"
                :alt="show.posterAlt"
                loading="lazy"
                decoding="async"
                referrerpolicy="no-referrer"
                class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                @error="posterFailed(show.slug)"
              >
            </span>
            <span class="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
              <span class="text-sm font-semibold text-nc-red-bright">{{ show.dateLabel }}</span>
              <span class="mt-1 font-display text-2xl leading-tight font-bold text-white">{{ show.title }}</span>
              <span class="mt-1.5 text-[0.9375rem] text-nc-mist">{{ show.location }}</span>
              <span class="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-white group-hover:underline">
                View event
                <svg aria-hidden="true" viewBox="0 0 16 16" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 11 11 5M6 5h5v5" /></svg>
              </span>
              <span class="sr-only">(opens {{ show.title }} on OnTreasure in a new tab)</span>
            </span>
          </a>
        </li>
      </ul>

      <!-- Nothing listed -->
      <div v-else-if="state === 'empty'" class="mt-10 rounded-md border border-nc-rule bg-nc-char p-6 sm:p-8" data-shows-empty>
        <p class="font-display text-2xl font-bold">No upcoming shows posted right now</p>
        <p class="mt-2 max-w-xl text-nc-mist">
          Nino’s OnTreasure profile has nothing scheduled at the moment. New shows appear here as soon as
          he lists them; Instagram usually has the heads-up first.
        </p>
      </div>

      <!-- OnTreasure couldn't be reached -->
      <div v-else class="mt-10 rounded-md border border-nc-rule bg-nc-char p-6 sm:p-8" data-shows-unavailable>
        <p class="font-display text-2xl font-bold">Show list unavailable right now</p>
        <p class="mt-2 max-w-xl text-nc-mist">
          We couldn’t load Nino’s shows from OnTreasure just now. His profile there has the current list.
        </p>
        <LinkButton to="ontreasure" variant="outline-light" class="mt-5">Open Nino’s OnTreasure profile</LinkButton>
      </div>

      <p class="mt-4 text-caption text-nc-mist">
        Dates and locations come from<template v-if="manual.length"> Nino and</template>{{ ' ' }}
        <a :href="links.onTreasureUrl" target="_blank" rel="noopener noreferrer" class="py-3.5 underline underline-offset-2 hover:text-white">Nino’s OnTreasure profile<span class="sr-only"> (opens in a new tab)</span></a>.
      </p>

      <!-- At the table -->
      <div class="mt-12 grid items-center gap-6 border-t border-nc-rule pt-10 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10">
        <figure class="relative">
          <IgImage :photo="table" sizes="(min-width: 768px) 22rem, 100vw" class="aspect-[16/10] w-full rounded-sm object-cover object-[50%_72%]" />
          <figcaption class="absolute bottom-2 left-2 rounded-md bg-nc-ink/80 px-2.5 py-1 text-caption text-white backdrop-blur-sm">
            “{{ table.caption }}” · {{ formatPostDate(table.postDate) }}
          </figcaption>
        </figure>
        <div>
          <p class="text-nc-mist">At the show, look for the black Nino’s Collectibles banner on the table:</p>
          <ul
            class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-3xl font-bold uppercase"
            aria-label="Banner text: Buy, Sell, Trade, Collect"
          >
            <template v-for="(word, i) in banner" :key="word">
              <li v-if="i > 0" aria-hidden="true" class="text-nc-red">·</li>
              <li>{{ word }}</li>
            </template>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
