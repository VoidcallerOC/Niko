<script setup lang="ts">
/**
 * Public card scanner + buy estimate, forked from the TCG Buy Calculator.
 * Customers and Nino use the same page at shows. Card lookup and market
 * prices come from this site's /api/cards (JustTCG, server-side key); the
 * offer is the configured buy rate of that market reference, in whole cents.
 * Nothing here signs in, saves, or reaches the admin.
 */
import { calculateOffer, formatMoney, formatRate, parsePercentageToBasisPoints } from '~/lib/pricing/money.js'
import { addEntry, removeEntry, summarize } from '~/lib/pricing/offer-list.js'

useHead({ title: "Scan a card — Nino's Collectibles" })

const config = useRuntimeConfig().public
const rateBasisPoints = parsePercentageToBasisPoints(String(config.buyRate ?? '60%'))
const staleDays = Number(config.staleThresholdDays ?? 7)

type Condition = (typeof SCAN_CONDITIONS)[number]
type Usability = ReturnType<typeof pricingState>
interface Estimate {
  usability: Usability
  offerCents?: number
  referenceCents?: number
  sourceUpdatedAt?: string | null
}
interface ListItem {
  key: string
  label: string
  condition: string
  offerCents: number | null
  referenceCents: number | null
  unavailable: string | null
}

const game = ref<string>('pokemon')
const query = ref('')
const results = ref<ScanCard[]>([])
const message = ref('Scan a card, or start typing to search.')
const loading = ref(false)
const card = ref<ScanCard | null>(null)
const condition = ref<Condition | null>(null)
const estimate = ref<Estimate | null>(null)
const list = ref<ListItem[]>([])
const scannerOpen = ref(false)
const scannerUsed = ref(false)
const scanButton = ref<HTMLButtonElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const resultPanel = ref<HTMLElement | null>(null)
const listSection = ref<HTMLElement | null>(null)
let request = 0
let added = 0
let timer: ReturnType<typeof setTimeout> | undefined
let returnFocus: HTMLElement | null = null

const summary = computed(() => summarize(list.value))
const rateLabel = formatRate(rateBasisPoints)
const money = (cents: number) => formatMoney(cents, 'USD')
const UNAVAILABLE: Record<Exclude<Usability, 'usable'>, [string, string, string]> = {
  missing: ['No online price for this condition.', 'We never invent a price or substitute another condition or printing. Nino can price it in person.', 'no price for this condition'],
  undated: ['The market price has no date.', 'We never show an undated price as current. Nino can price it in person.', 'price has no date'],
  stale: ['The market price is out of date.', `Prices older than ${staleDays} days are never used. Nino can price it in person.`, 'price out of date'],
}

async function runSearch(q: string) {
  const id = ++request
  loading.value = true
  message.value = 'Searching live card data…'
  try {
    const cards = await searchCards(q, game.value)
    if (id !== request) return
    results.value = cards.slice(0, 12)
    message.value = cards.length ? `${cards.length} matching card${cards.length === 1 ? '' : 's'}. Select one to continue.` : 'No matching cards found. Try a card number or set code.'
  } catch (error) {
    if (id !== request) return
    results.value = []
    message.value = (error as Error).message
  } finally {
    if (id === request) loading.value = false
  }
}

function onInput() {
  clearTimeout(timer)
  card.value = null
  estimate.value = null
  const q = query.value.trim()
  if (q.length < 2) {
    request += 1
    results.value = []
    loading.value = false
    message.value = 'Scan a card, or start typing to search.'
    return
  }
  timer = setTimeout(() => runSearch(q), 300)
}

function selectCard(next: ScanCard, note = 'Card selected. Choose its condition.') {
  card.value = next
  query.value = cardLabel(next)
  message.value = note
  estimate.value = null
}

function chooseCondition(next: Condition) {
  condition.value = next
  estimate.value = null
}

function onGameChange() {
  clearTimeout(timer)
  request += 1
  card.value = null
  condition.value = null
  estimate.value = null
  results.value = []
  loading.value = false
  if (query.value.trim().length >= 2) timer = setTimeout(() => runSearch(query.value.trim()), 300)
}

function calculate() {
  if (!card.value || !condition.value) return
  const pricing = card.value.pricing?.[condition.value.code]
  const usability = pricingState(pricing, staleDays)
  if (usability !== 'usable' || !pricing) {
    estimate.value = { usability }
  } else {
    const result = calculateOffer(pricing.reference_cents, rateBasisPoints)
    estimate.value = { usability, offerCents: result.offerCents, referenceCents: result.referenceCents, sourceUpdatedAt: pricing.source_updated_at }
  }
  nextTick(() => resultPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}

// The list only copies what was just shown; unpriced cards are never totalled.
function addToList() {
  if (!card.value || !condition.value || !estimate.value) return
  const label = cardLabel(card.value)
  added += 1
  list.value = addEntry(list.value, {
    key: `card-${added}`,
    label,
    condition: condition.value.name,
    ...(estimate.value.usability === 'usable'
      ? { offerCents: estimate.value.offerCents, referenceCents: estimate.value.referenceCents, sourceUpdatedAt: estimate.value.sourceUpdatedAt }
      : { unavailable: UNAVAILABLE[estimate.value.usability][2] }),
  })
  // Back to step 1 for the next card; the list and the game stay.
  request += 1
  clearTimeout(timer)
  card.value = null
  condition.value = null
  estimate.value = null
  results.value = []
  query.value = ''
  loading.value = false
  message.value = `Added ${label}. Scan or search the next card.`
  nextTick(() => {
    listSection.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    listSection.value?.querySelector<HTMLButtonElement>('[data-scan-next]')?.focus({ preventScroll: true })
  })
}

function removeItem(key: string) {
  list.value = removeEntry(list.value, key)
  nextTick(() => (list.value.length ? listSection.value?.querySelector<HTMLButtonElement>('[data-scan-next]') : scanButton.value)?.focus())
}

function clearList() {
  if (!window.confirm('Remove every card from this list?')) return
  list.value = []
  nextTick(() => scanButton.value?.focus())
}

function openScanner(event: Event) {
  returnFocus = event.currentTarget as HTMLElement
  scannerUsed.value = true
  scannerOpen.value = true
  document.body.style.overflow = 'hidden'
}
function closeScanner() {
  scannerOpen.value = false
  document.body.style.overflow = ''
  nextTick(() => returnFocus?.focus())
}

// A scanned card enters the same selection path as a search result.
function onScanConfirm(next: ScanCard) {
  closeScanner()
  if (next.game && SCAN_GAMES.some((g) => g.value === next.game) && next.game !== game.value) {
    game.value = next.game
    condition.value = null
  }
  request += 1
  clearTimeout(timer)
  loading.value = false
  results.value = [next]
  selectCard(next, 'Card confirmed from your scan. Choose its condition.')
}
function onScanManual(q: string) {
  closeScanner()
  if (q) {
    query.value = q
    onInput()
  }
  nextTick(() => searchInput.value?.focus())
}
onBeforeUnmount(() => {
  clearTimeout(timer)
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <div>
    <StarField />
    <div class="relative z-10">
      <SiteHeader />
      <main id="main" tabindex="-1" class="wrap py-10 sm:py-14">
        <header class="max-w-2xl">
          <p class="text-caption font-semibold tracking-wide text-nc-red-bright uppercase">Selling cards?</p>
          <h1 class="mt-2 font-display text-title font-extrabold uppercase">Scan a card</h1>
          <p class="mt-4 text-lede text-nc-mist">
            Point your phone at a card to see an estimated offer from Nino: {{ rateLabel }} of the current JustTCG market price. The final offer is made in person after Nino sees the card.
          </p>
        </header>

        <div class="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section class="rounded-lg border border-white/10 bg-nc-coal/90 p-5 sm:p-7" aria-label="Find your card">
            <h2 class="font-display text-subtitle font-bold uppercase"><span class="text-nc-red-bright">1</span> Find your card</h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <label for="scan-game" class="mb-1.5 block text-sm font-semibold text-white/85">Game</label>
                <select id="scan-game" v-model="game" class="min-h-12 w-full rounded-md border border-white/20 bg-nc-char px-3.5 text-base text-white focus:border-nc-red focus:outline-none" @change="onGameChange">
                  <option v-for="g in SCAN_GAMES" :key="g.value" :value="g.value">{{ g.label }}</option>
                </select>
              </div>
              <button
                ref="scanButton"
                type="button"
                aria-haspopup="dialog"
                class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-nc-red px-5 text-base font-semibold text-white transition-colors hover:bg-nc-red-dark"
                data-scan-open
                @click="openScanner"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
                  <rect x="8.5" y="7" width="7" height="10" rx="1" />
                </svg>
                Scan a card
              </button>
            </div>
            <label for="scan-search" class="mt-5 mb-1.5 block text-sm font-semibold text-white/85">Or search by name, number or set</label>
            <input
              id="scan-search"
              ref="searchInput"
              v-model="query"
              type="search"
              autocomplete="off"
              placeholder="Try “Charizard”, “199/165” or “OP05-119”"
              :aria-busy="loading"
              class="min-h-12 w-full rounded-md border border-white/20 bg-nc-char px-3.5 text-base text-white placeholder:text-white/35 focus:border-nc-red focus:outline-none"
              @input="onInput"
            >
            <p class="mt-2 text-sm text-nc-mist" aria-live="polite" data-scan-message>{{ message }}</p>
            <ul v-if="results.length" class="mt-3 grid gap-2" role="list">
              <li v-for="r in results" :key="r.id">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors"
                  :class="card?.id === r.id ? 'border-nc-red bg-nc-char' : 'border-white/15 hover:border-white/35'"
                  :aria-pressed="card?.id === r.id"
                  data-scan-result
                  @click="selectCard(r)"
                >
                  <span class="min-w-0">
                    <strong class="block break-words">{{ r.name }}</strong>
                    <small class="block text-sm break-words text-nc-mist">{{ [r.set_name, r.printing, r.language && r.language !== 'English' ? r.language : null, r.rarity].filter(Boolean).join(' · ') || 'Set not listed' }}</small>
                  </span>
                  <span class="shrink-0 font-mono text-sm text-white/75">{{ r.card_number || 'No number' }}</span>
                </button>
              </li>
            </ul>

            <h2 class="mt-8 font-display text-subtitle font-bold uppercase"><span class="text-nc-red-bright">2</span> Condition</h2>
            <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Card condition">
              <button
                v-for="c in SCAN_CONDITIONS"
                :key="c.code"
                type="button"
                class="min-h-12 rounded-md border px-2 text-sm font-semibold transition-colors"
                :class="condition?.code === c.code ? 'border-nc-red bg-nc-red text-white' : 'border-white/20 text-white/85 hover:border-white/45'"
                :aria-pressed="condition?.code === c.code"
                :data-condition="c.code"
                @click="chooseCondition(c)"
              >
                {{ c.name }}
              </button>
            </div>
            <button
              type="button"
              class="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-md bg-white px-5 text-base font-semibold text-nc-ink transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!card || !condition || loading"
              @click="calculate"
            >
              See estimated offer
            </button>
            <p v-if="!card || !condition" class="mt-2 text-sm text-white/50">{{ !card ? 'Select a card' : 'Choose a condition' }} to see an offer.</p>
          </section>

          <aside ref="resultPanel" class="rounded-lg border border-white/10 bg-nc-char/95 p-5 sm:p-7" aria-live="polite" aria-labelledby="offer-heading" data-scan-offer>
            <h2 id="offer-heading" class="font-display text-subtitle font-bold uppercase"><span class="text-nc-red-bright">3</span> Estimated offer</h2>
            <template v-if="estimate?.usability === 'usable' && card && condition">
              <p class="mt-3 font-display text-hero font-extrabold" data-offer-value>{{ money(estimate.offerCents!) }}</p>
              <p class="mt-2 font-semibold">{{ cardLabel(card) }} · {{ condition.name }}</p>
              <dl class="mt-4 divide-y divide-white/10 border-y border-white/10 text-sm">
                <div class="flex justify-between py-2.5"><dt>Market reference (JustTCG)</dt><dd class="font-mono" data-reference-value>{{ money(estimate.referenceCents!) }}</dd></div>
                <div class="flex justify-between py-2.5"><dt>Nino’s buy rate</dt><dd class="font-mono">{{ rateLabel }}</dd></div>
              </dl>
              <p v-if="estimate.sourceUpdatedAt" class="mt-3 text-sm text-nc-mist">Market price updated {{ new Date(estimate.sourceUpdatedAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) }}.</p>
            </template>
            <div v-else-if="estimate" class="mt-4 rounded-md border border-amber-400/40 bg-amber-400/10 p-4" role="status" data-offer-unavailable>
              <strong class="block">{{ UNAVAILABLE[estimate.usability as Exclude<Usability, 'usable'>][0] }}</strong>
              <p class="mt-1 text-sm text-nc-mist">{{ UNAVAILABLE[estimate.usability as Exclude<Usability, 'usable'>][1] }}</p>
            </div>
            <div v-else class="mt-4">
              <p class="font-display text-hero font-extrabold text-white/20" aria-hidden="true">$—</p>
              <p class="mt-2 text-nc-mist">Pick a card and its condition to see an estimate.</p>
            </div>
            <AdminButton v-if="estimate" variant="red" size="lg" block class="mt-5" data-add-to-list @click="addToList">
              {{ estimate.usability === 'usable' ? 'Add to my list' : 'Add to my list without an estimate' }}
            </AdminButton>
            <p class="mt-5 text-xs leading-relaxed text-white/50">
              Estimates use JustTCG market observations, not a quote. Prices older than {{ staleDays }} days are never used. Final offer may change after Nino inspects condition, authenticity and printing.
            </p>
          </aside>
        </div>

        <section v-if="list.length" ref="listSection" class="mt-6 rounded-lg border border-white/10 bg-nc-coal/90 p-5 sm:p-7" aria-labelledby="list-heading" data-scan-list>
          <div class="flex items-start justify-between gap-3">
            <h2 id="list-heading" class="font-display text-subtitle font-bold uppercase">Cards in this visit</h2>
            <span class="rounded-full px-3 py-1 font-mono text-xs text-nc-mist ring-1 ring-white/20" data-list-count>{{ summary.count }} card{{ summary.count === 1 ? '' : 's' }}</span>
          </div>
          <ul class="mt-4 divide-y divide-white/10 border-y border-white/10" role="list">
            <li v-for="item in list" :key="item.key" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]" data-list-item>
              <span class="min-w-0">
                <strong class="block break-words">{{ item.label }}</strong>
                <small class="block text-sm text-nc-mist">{{ item.condition }} · {{ item.offerCents === null ? item.unavailable : `market ${money(item.referenceCents!)}` }}</small>
              </span>
              <span class="font-mono font-semibold">{{ item.offerCents === null ? 'In person' : money(item.offerCents) }}</span>
              <button type="button" class="col-span-2 min-h-11 justify-self-start rounded-md px-3 text-sm text-white/70 ring-1 ring-white/20 ring-inset hover:text-nc-red-bright hover:ring-nc-red sm:col-span-1" :aria-label="`Remove ${item.label}, ${item.condition}`" @click="removeItem(item.key)">Remove</button>
            </li>
          </ul>
          <div class="flex items-baseline justify-between gap-3 pt-4">
            <span>Estimated total offer</span>
            <strong class="font-display text-4xl font-extrabold" data-list-total>{{ money(summary.offerCents) }}</strong>
          </div>
          <p class="mt-1 text-sm text-white/55" aria-live="polite" data-list-note>
            <template v-if="summary.unpriced">{{ summary.unpriced }} card{{ summary.unpriced === 1 ? ' has' : 's have' }} no online estimate and {{ summary.unpriced === 1 ? 'is' : 'are' }} not in the total; Nino prices {{ summary.unpriced === 1 ? 'it' : 'them' }} in person. </template>
            Each estimate uses the market price shown when it was added. Final offer in person.
          </p>
          <div class="mt-4 grid gap-2 sm:grid-cols-[2fr_1fr]">
            <AdminButton variant="red" size="lg" data-scan-next @click="openScanner">Scan next card</AdminButton>
            <AdminButton variant="outline" size="lg" @click="clearList">Clear list</AdminButton>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
    <ClientOnly>
      <LazyScanCamera v-if="scannerUsed" :open="scannerOpen" :selected-game="game" :search="searchCards" @confirm="onScanConfirm" @manual="onScanManual" @close="closeScanner" />
    </ClientOnly>
  </div>
</template>
