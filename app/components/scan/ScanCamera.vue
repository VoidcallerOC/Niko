<script setup lang="ts">
/**
 * Camera scanner dialog for the public /scan page. Logic is the TCG Buy
 * Calculator's scanner (app/lib/scanner, forked): camera → on-device OCR →
 * catalog match through this site's /api/cards → the customer confirms.
 * It never picks a card by itself, and no photo leaves the phone.
 */
import { CameraCapture } from '~/lib/scanner/camera-capture.js'
import { preprocessCard } from '~/lib/scanner/image-preprocessor.js'
import { createTesseractEngine } from '~/lib/scanner/ocr-engine.js'
import { createScanSession, SCAN_STATE, SCAN_ERROR } from '~/lib/scanner/scan-session.js'
import { MATCH_STATUS, printedName, variantLabels } from '~/lib/scanner/catalog-matcher.js'
import { gameLabel } from '~/lib/scanner/game-patterns.js'
import { bestSearchQuery, correctClues } from '~/lib/scanner/card-identifier.js'
import { formatMoney } from '~/lib/pricing/money.js'
import type { ScanCard } from '~/composables/useCardSearch'

const props = defineProps<{ open: boolean; selectedGame: string; search: (q: string, game: string) => Promise<ScanCard[]> }>()
const emit = defineEmits<{ confirm: [card: ScanCard]; manual: [query: string]; close: [] }>()

interface Clues {
  identifiers: { game: string; query: string | null; raw: string }[]
  names: string[]
  corrected?: boolean
}
interface Candidate {
  card: ScanCard & { provider_card_id?: string }
  game: string
  numberMatch?: boolean
  numberConflict?: boolean
  nameConflict?: boolean
  readNumbers?: string[]
}
interface Match {
  status: string
  candidates: Candidate[]
  reason?: string
  leader?: boolean
  needsNumber?: boolean
  checkNumber?: boolean
  numberOnly?: boolean
  moreCards?: number
  setChoice?: boolean
  setCount?: number
}
interface ScanState {
  status: string
  step?: string
  code?: string
  message?: string
  clues?: Clues
  match?: Match | null
}

const ERRORS: Record<string, [string, string, boolean]> = {
  [SCAN_ERROR.DENIED]: ['Camera access is blocked.', 'Allow camera access for this site in your browser settings, then try again. Or search for the card by name.', true],
  [SCAN_ERROR.UNAVAILABLE]: ['No camera found.', 'This device has no camera we can use. Search for the card by name instead.', false],
  [SCAN_ERROR.BUSY]: ['The camera is in use.', 'Close any other app or tab using the camera, then try again.', true],
  [SCAN_ERROR.UNSUPPORTED]: ['This browser can’t open the camera.', 'Try a current version of Safari or Chrome, or search for the card by name.', false],
  [SCAN_ERROR.INSECURE]: ['The camera needs a secure connection.', 'Open this page over https to scan. You can still search by name.', false],
  [SCAN_ERROR.FAILED]: ['The camera didn’t start.', 'Try again, or search for the card by name.', true],
  [SCAN_ERROR.CAPTURE_FAILED]: ['That photo didn’t capture.', 'Hold steady with the whole card in the frame and try again.', true],
  [SCAN_ERROR.OCR_UNAVAILABLE]: ['The card reader couldn’t load on this device.', 'Scanning isn’t available here right now. Search for the card by name instead.', true],
  [SCAN_ERROR.OCR_FAILED]: ['We couldn’t read that photo.', 'Try again with less glare, or search by name.', true],
  [SCAN_ERROR.SEARCH_FAILED]: ['Card lookup is unavailable right now.', 'We read the card but couldn’t search the catalog. No price has been estimated.', true],
}

const root = ref<HTMLElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const guide = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const state = ref<ScanState>({ status: SCAN_STATE.IDLE })
const loadingEngine = ref(false)
const fixName = ref('')
const fixNumber = ref('')

const camera = new CameraCapture()
// The forked JS module's JSDoc omits onProgress; it is supported (ocr-engine.js).
const createEngine = createTesseractEngine as (options: { onProgress?: (message: { status?: string }) => void }) => ReturnType<typeof createTesseractEngine>
const ocr = createEngine({
  onProgress: (message) => {
    if (state.value.status === SCAN_STATE.PROCESSING && /loading/.test(message.status ?? '')) loadingEngine.value = true
  },
})
const session = createScanSession({
  camera: {
    start: () => camera.start(video.value),
    capture: () => camera.captureSharpest(video.value, guide.value),
    stop: () => camera.stop(video.value),
  },
  preprocess: (frame: HTMLCanvasElement) => preprocessCard(frame),
  ocr,
  search: (query: string, game: string) => props.search(query, game),
  selectedGame: () => props.selectedGame,
  onState: (value: object) => {
    const next = value as ScanState
    state.value = next
    if (next.status !== SCAN_STATE.PROCESSING) loadingEngine.value = false
    if (next.status === SCAN_STATE.RESULT || next.code === SCAN_ERROR.SEARCH_FAILED) {
      fixName.value = next.clues?.names?.[0] ?? ''
      fixNumber.value = next.clues?.identifiers?.find((item) => item.query)?.query ?? ''
    }
  },
})

async function start() {
  await nextTick()
  closeButton.value?.focus()
  session.open()
}
// The camera needs the mounted <video>, so the first start waits for mount.
onMounted(() => {
  if (props.open) start()
})
watch(
  () => props.open,
  (open) => (open ? start() : session.close()),
)
onBeforeUnmount(() => {
  session.close()
  ocr.terminate()
})

const lastQuery = computed(() => bestSearchQuery(state.value.clues))
const hint = computed(() => {
  const s = state.value
  if (s.status === SCAN_STATE.STARTING) return 'Starting camera…'
  if (s.status === SCAN_STATE.LIVE) return 'Place the whole card inside the frame'
  if (s.status === SCAN_STATE.PROCESSING) {
    if (loadingEngine.value) return 'Loading the card reader (first scan only)…'
    return s.step === 'capturing' ? 'Hold steady…' : s.step === 'matching' ? 'Looking up the card…' : 'Reading the card…'
  }
  if (s.status === SCAN_STATE.RESULT) return s.match?.status === MATCH_STATUS.IDENTIFIED ? 'Card found' : s.match?.status === MATCH_STATUS.NEEDS_CONFIRMATION ? 'Confirm your card' : 'Not identified'
  return ''
})
const readLine = computed(() => {
  const clues = state.value.clues
  if (!clues) return ''
  const read = [...clues.identifiers.map((item) => item.raw), ...clues.names.slice(0, 2)]
  if (!read.length) return 'No readable text found on the card.'
  return `${clues.corrected ? 'You entered' : 'Read from card (text only, not verified)'}: ${read.join(' · ')}`
})
const error = computed(() => (state.value.status === SCAN_STATE.ERROR ? (ERRORS[state.value.code ?? ''] ?? ERRORS[SCAN_ERROR.FAILED]) : null))
const showFix = computed(() => state.value.status === SCAN_STATE.RESULT || (state.value.code === SCAN_ERROR.SEARCH_FAILED && !!state.value.clues))
const fixOpenByDefault = computed(() => {
  const match = state.value.status === SCAN_STATE.RESULT ? state.value.match : null
  if (match?.status === MATCH_STATUS.NOT_IDENTIFIED) return true
  return match?.status === MATCH_STATUS.NEEDS_CONFIRMATION && (match.needsNumber === true || match.checkNumber === true || confirm.value?.askForNumber === true)
})

// Needs-confirmation screen. Only a card whose evidence beats the rest is
// highlighted, and all of its printings equally: the scan says which card,
// never which printing (1st Edition and Unlimited can differ several-fold).
const cardOf = (item: Candidate) => item.card.provider_card_id ?? item.card.id
const confirm = computed(() => {
  const match = state.value.match
  if (state.value.status !== SCAN_STATE.RESULT || match?.status !== MATCH_STATUS.NEEDS_CONFIRMATION) return null
  const clues = state.value.clues
  const lead = match.leader === true && match.candidates[0] ? cardOf(match.candidates[0]) : null
  // Same-number multi-set groups (OP12-020 ST-32 vs Learn Together) never get
  // a lead — set/product must be chosen explicitly, so the set is emphasized.
  const setChoice = match.setChoice === true
  const readNumbers = (clues?.identifiers ?? []).filter((item) => item.query).map((item) => item.raw ?? item.query)
  const cardCount = new Set(match.candidates.map(cardOf)).size
  // Printings that share the number read (alternate art, manga, SP, reprints…)
  // print the same name and number, so the text read cannot choose between
  // them, yet their values can differ several hundredfold. Say so, with the
  // range, instead of implying a pick.
  const numbered = match.candidates.filter((item) => item.numberMatch && !item.nameConflict)
  const printings = new Set(numbered.map(cardOf)).size
  const printingChoice = !match.leader && printings > 1
  const nm = numbered.map((item) => item.card.pricing?.NM?.reference_cents).filter((cents): cents is number => Number.isSafeInteger(cents))
  const unpriced = numbered.length - nm.length
  const hasRange = nm.length > 1 && Math.max(...nm) > Math.min(...nm)
  const valueRange = hasRange ? `their Near Mint market references range from ${formatMoney(Math.min(...nm))} to ${formatMoney(Math.max(...nm))}` : 'they can differ in value'
  const numbers = readNumbers.join(', ')
  // needsNumber is about missing collector-number evidence; the title must
  // match what is actually listed (never "several" for one row).
  const askForNumber = match.needsNumber === true || (cardCount >= 1 && !readNumbers.length && !numbered.length && (cardCount > 1 || (match.moreCards ?? 0) > 0))
  const setCount = match.setCount || numbered.length
  const title = match.checkNumber
    ? 'The name and number we read point to different cards.'
    : setChoice
      ? `${setCount} sets share this number. Which set and printing is yours?`
      : askForNumber && cardCount > 1
        ? 'Several cards match the name. Which one is yours?'
        : askForNumber && cardCount === 1
          ? 'We need the card number to confirm this printing.'
          : printingChoice
            ? `${printings} printings share this number. Which one is yours?`
            : match.candidates.length > 1
              ? 'Which card is in your hand?'
              : 'Is this your card?'
  const notes = [
    setChoice
      ? `One Piece reprints keep the same collector number across starter decks, Learn Together products, parallels and promos. Check the set or product name on each row (not just the number) — prices differ${hasRange ? ` (${valueRange})` : ''}. The shop confirms set and printing in person.`
      : printingChoice
        ? `They print the same name and number but differ in artwork, and ${valueRange}${unpriced ? ` (${unpriced} with no online price)` : ''}. Compare the artwork, set and label (e.g. Alternate Art, Manga, SP) with your card. The shop checks the printing in person.`
        : '',
    match.checkNumber
      ? clues?.corrected
        ? `Check the name and number (${numbers}) printed on your card and correct them below.`
        : `We may have misread the number (${numbers}). Check the name and number printed on your card and correct them below if they differ.`
      : askForNumber
        ? readNumbers.length
          ? `The number we read (${numbers}) doesn't match any of these cards. Check the number printed at the bottom of your card and type it below, or compare the set and number of each match.`
          : "We read the name but not the card number, so we can't tell which set or printing this is. Type the number at the bottom of your card (e.g. OP02-030 or 43/64) below — that finds parallels and alternate arts the name alone cannot."
        : match.numberOnly && !clues?.corrected
          ? `Matched only by the number we read (${numbers}); we could not read the name. Check that the name and number match your card.`
          : '',
  ].filter(Boolean)
  const more = (match.moreCards ?? 0) > 0 ? (numbered.length ? `${match.moreCards} more cards with a different number are not shown.` : `Showing ${cardCount} matching cards; ${match.moreCards} more match. Type the card number to reach other printings (including alternate arts).`) : ''
  return { lead, setChoice, askForNumber, title, notes, more }
})
const isLead = (item: Candidate, index: number) => (confirm.value ? confirm.value.lead !== null && cardOf(item) === confirm.value.lead : index === 0)
function conflicts(item: Candidate) {
  return [
    item.numberConflict ? `Number on this card: ${item.card.card_number}. Read from your card: ${(item.readNumbers ?? []).join(', ')}.` : '',
    item.nameConflict ? "Only the number matches: the name read from your card is not this card's name." : '',
  ].filter(Boolean)
}

// A scan identifies the card, never its printing: the character name carries
// the identity and the set/product carries the reprint (ST-32 vs Learn
// Together vs Parallel). Catalog-only tags are dropped from the title and
// shown as variant labels; the printing line keeps number, printing, rarity.
function candidateTitle(card: ScanCard) {
  return printedName(card.name) || card.name
}
function candidateVariants(card: ScanCard): string[] {
  return variantLabels(card.name)
}
function printingLine(card: ScanCard) {
  return [card.card_number, card.printing, card.rarity, card.language && card.language !== 'English' ? card.language : null].filter(Boolean).join(' · ') || 'Printing not listed'
}
function close() {
  emit('close')
}
function manual() {
  emit('manual', lastQuery.value)
}
function searchAgain() {
  session.rematch(correctClues(state.value.clues, { name: fixName.value, number: fixNumber.value }, props.selectedGame))
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !root.value) return
  // Modal dialog: keep Tab focus inside the scanner.
  const focusable = [...root.value.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, summary')].filter((node) => node.offsetParent !== null)
  if (!focusable.length) return
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <div
    v-show="open"
    ref="root"
    role="dialog"
    aria-modal="true"
    aria-labelledby="scanner-heading"
    class="fixed inset-0 z-50 flex flex-col bg-nc-ink text-white md:inset-auto md:top-1/2 md:left-1/2 md:h-[min(860px,calc(100vh-3rem))] md:w-[min(560px,calc(100vw-3rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:ring-1 md:ring-white/15"
    data-scanner
    :data-state="state.status"
    @keydown="onKeydown"
  >
    <div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div>
        <p class="text-caption font-semibold tracking-wide text-nc-red-bright uppercase">Nino’s Collectibles</p>
        <h2 id="scanner-heading" class="font-display text-2xl font-bold uppercase">Scan a card</h2>
      </div>
      <button ref="closeButton" type="button" class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-2xl ring-1 ring-white/25 ring-inset hover:bg-white/10" aria-label="Close scanner" @click="close">&times;</button>
    </div>

    <div class="relative min-h-0 flex-1 overflow-hidden bg-black" :class="{ hidden: state.status === SCAN_STATE.ERROR }">
      <video ref="video" class="h-full w-full object-cover" :class="{ 'opacity-30': state.status === SCAN_STATE.RESULT }" playsinline muted />
      <div
        ref="guide"
        aria-hidden="true"
        class="pointer-events-none absolute top-1/2 left-1/2 aspect-[63/88] h-[78%] max-w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white/85 shadow-[0_0_0_200vmax_rgba(0,0,0,0.45)]"
        :class="{ 'animate-pulse border-nc-red-bright': state.status === SCAN_STATE.PROCESSING, hidden: state.status === SCAN_STATE.RESULT }"
      />
      <p v-if="hint" class="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1.5 text-sm font-semibold whitespace-nowrap" aria-live="polite">{{ hint }}</p>
    </div>

    <div class="max-h-[58vh] shrink-0 overflow-y-auto border-t-2 border-nc-red bg-nc-coal p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" :class="{ 'max-h-none flex-1': state.status === SCAN_STATE.ERROR }" aria-live="polite" data-scanner-panel>
      <template v-if="state.status === SCAN_STATE.STARTING">
        <p class="mb-3 text-sm text-nc-mist">Your browser may ask to use the camera. Photos stay on this phone.</p>
        <AdminButton variant="outline" block @click="manual">Search manually</AdminButton>
      </template>

      <template v-else-if="state.status === SCAN_STATE.LIVE">
        <p class="mb-3 text-sm text-nc-mist">Fill the frame, avoid glare, and keep the card flat.</p>
        <div class="grid gap-2">
          <AdminButton variant="red" size="lg" block @click="session.capture()">Capture</AdminButton>
          <AdminButton variant="outline" block @click="manual">Search manually</AdminButton>
        </div>
      </template>

      <template v-else-if="state.status === SCAN_STATE.PROCESSING">
        <p class="mb-3 text-sm text-nc-mist">Reading the printed text on the card. This can take a few seconds.</p>
        <p v-if="readLine" class="mb-3 text-sm break-words text-white/55" data-scanner-read>{{ readLine }}</p>
        <AdminButton variant="outline" block @click="session.retry()">Cancel</AdminButton>
      </template>

      <template v-else-if="state.status === SCAN_STATE.RESULT && state.match">
        <template v-if="state.match.status !== MATCH_STATUS.NOT_IDENTIFIED">
          <p class="text-caption font-semibold tracking-wide text-nc-red-bright uppercase">{{ state.match.status === MATCH_STATUS.IDENTIFIED ? 'Card found' : 'Needs confirmation' }}</p>
          <template v-if="confirm">
            <p class="mb-2 font-display text-2xl font-bold">{{ confirm.title }}</p>
            <p v-for="note in confirm.notes" :key="note" class="mb-2 text-sm text-nc-mist">{{ note }}</p>
          </template>
          <ul class="mt-2 grid gap-2" role="list">
            <li v-for="(item, index) in state.match.candidates" :key="item.card.id" class="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between" :class="isLead(item, index) ? 'border-nc-red bg-nc-char' : 'border-white/15'" data-scan-candidate>
              <div class="min-w-0">
                <strong class="block text-lg break-words">{{ candidateTitle(item.card) }}</strong>
                <span v-if="candidateVariants(item.card).length" class="block text-sm break-words text-nc-red-bright">{{ candidateVariants(item.card).join(' · ') }}</span>
                <span class="block text-sm break-words" :class="confirm?.setChoice ? 'font-semibold text-white' : 'text-nc-mist'">{{ item.card.set_name || 'Set not listed' }}</span>
                <span class="block text-sm break-words text-nc-mist">{{ printingLine(item.card) }}</span>
                <small v-if="gameLabel(item.game)" class="block text-xs text-white/50">{{ gameLabel(item.game) }}</small>
                <small v-for="line in conflicts(item)" :key="line" class="block text-xs text-white/50">{{ line }}</small>
              </div>
              <AdminButton :variant="isLead(item, index) ? 'red' : 'white'" size="sm" @click="emit('confirm', item.card)">Use this card</AdminButton>
            </li>
          </ul>
          <p v-if="confirm?.more" class="mt-3 text-sm text-nc-mist">{{ confirm.more }}</p>
          <p class="mt-3 text-sm text-nc-mist">Catalog match from the text on the card. Check the set and printing (foil, edition) yourself; condition is never judged from the photo.</p>
        </template>
        <template v-else>
          <p class="text-caption font-semibold tracking-wide text-nc-red-bright uppercase">Could not identify</p>
          <p class="mb-2 font-display text-2xl font-bold">{{ state.match.reason === 'no_text' ? 'We couldn’t read the card.' : 'We couldn’t confidently identify this card.' }}</p>
          <p class="mb-2 text-sm text-nc-mist">
            {{ state.match.reason === 'no_text' ? 'Hold the phone steady about 15–20 cm (6–8 in) from the card, wait for it to focus, then capture. Good light helps; avoid glare.' : 'Try again with the whole card in the frame and less glare, fix what was read below, or search by name.' }}
          </p>
        </template>
      </template>

      <template v-else-if="error">
        <p class="text-caption font-semibold tracking-wide text-nc-red-bright uppercase">Scanner</p>
        <p class="mb-2 font-display text-2xl font-bold">{{ error[0] }}</p>
        <p class="mb-2 text-sm text-nc-mist">{{ error[1] }}</p>
        <p v-if="state.code === SCAN_ERROR.SEARCH_FAILED && state.message" class="mb-2 text-sm text-white/55">{{ state.message }}</p>
      </template>

      <template v-if="state.status === SCAN_STATE.RESULT || error">
        <p v-if="readLine" class="my-3 text-sm break-words text-white/55" data-scanner-read>{{ readLine }}</p>
        <details v-if="showFix" :key="`${state.status}-${readLine}`" :open="fixOpenByDefault" class="mb-3 rounded-md border border-white/15 bg-nc-char">
          <summary class="flex min-h-11 cursor-pointer items-center px-3 font-semibold">{{ state.clues?.names?.length || state.clues?.identifiers?.length ? 'Fix what was read' : 'Type the card details' }}</summary>
          <form class="grid gap-3 px-3 pb-3" @submit.prevent="searchAgain">
            <AdminField v-model="fixName" label="Card name" placeholder="e.g. Charizard ex" />
            <AdminField v-model="fixNumber" label="Card number" placeholder="e.g. 199/165 or OP05-119" />
            <AdminButton type="submit" variant="white" block>Search again</AdminButton>
          </form>
        </details>
        <div class="grid grid-cols-2 gap-2">
          <AdminButton v-if="state.status === SCAN_STATE.RESULT || error?.[2]" variant="outline" @click="session.retry()">{{ error ? 'Try again' : 'Scan again' }}</AdminButton>
          <AdminButton variant="outline" :class="{ 'col-span-2': !(state.status === SCAN_STATE.RESULT || error?.[2]) }" @click="manual">{{ lastQuery ? `Search “${lastQuery}”` : 'Search manually' }}</AdminButton>
        </div>
      </template>
    </div>
  </div>
</template>
