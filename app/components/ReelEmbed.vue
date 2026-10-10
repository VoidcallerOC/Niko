<script setup lang="ts">
import type { IgPhoto } from '~/data/media'
import { site } from '~/data/site'

/**
 * Nino's Reel. Server-rendered as a linked cover (works without JS and when
 * Instagram is blocked). On the client we try Instagram's official embed
 * (blockquote + embed.js) and only swap it in once Instagram reports the
 * iframe rendered; on error or timeout the linked cover stays.
 */
const props = defineProps<{ reel: IgPhoto }>()

const EMBED_SCRIPT = 'https://www.instagram.com/embed.js'
const TIMEOUT_MS = 10000

const state = ref<'fallback' | 'loading' | 'embedded'>('fallback')
const host = ref<HTMLElement | null>(null)
const iframeTitle = `Instagram Reel by ${site.handle}: “${props.reel.caption}”`

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

function loadScript(): Promise<void> {
  if (window.instgrm) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${EMBED_SCRIPT}"]`)
    const s = existing ?? document.createElement('script')
    s.addEventListener('load', () => resolve(), { once: true })
    s.addEventListener('error', () => reject(new Error('embed.js failed')), { once: true })
    if (!existing) {
      s.src = EMBED_SCRIPT
      s.async = true
      document.body.appendChild(s)
    }
  })
}

let timer: ReturnType<typeof setTimeout> | undefined
let poll: ReturnType<typeof setInterval> | undefined

function giveUp() {
  clearInterval(poll)
  clearTimeout(timer)
  if (host.value) host.value.innerHTML = ''
  state.value = 'fallback'
}

onMounted(async () => {
  if (!host.value) return
  state.value = 'loading'

  const bq = document.createElement('blockquote')
  bq.className = 'instagram-media'
  bq.setAttribute('data-instgrm-permalink', props.reel.postUrl)
  bq.setAttribute('data-instgrm-version', '14')
  bq.style.cssText = 'background:#fff;border:0;margin:0;min-width:326px;max-width:540px;width:100%;'
  const a = document.createElement('a')
  a.href = props.reel.postUrl
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.textContent = 'Watch this Reel on Instagram'
  bq.appendChild(a)
  host.value.appendChild(bq)

  timer = setTimeout(giveUp, TIMEOUT_MS)
  try {
    await loadScript()
    window.instgrm?.Embeds.process()
  } catch {
    giveUp()
    return
  }

  // embed.js adds `instagram-media-rendered` only after the iframe reports its size.
  poll = setInterval(() => {
    const frame = host.value?.querySelector<HTMLIFrameElement>('iframe.instagram-media-rendered')
    if (frame) {
      clearInterval(poll)
      clearTimeout(timer)
      frame.title = iframeTitle
      state.value = 'embedded'
    }
  }, 250)
})

onBeforeUnmount(() => {
  clearInterval(poll)
  clearTimeout(timer)
})
</script>

<template>
  <!--
    Phones: cover and caption side by side so the 9:16 cover doesn't tower.
    sm and up: a single column whose width follows the state (15rem cover, 21rem embed).
  -->
  <figure
    :class="[
      'grid grid-cols-[8.5rem_1fr] items-end gap-4 min-[360px]:grid-cols-[9.5rem_1fr] sm:block',
      state === 'embedded' ? 'sm:w-[21rem]' : 'sm:w-[15rem]',
    ]"
    :data-reel-state="state"
  >
    <!-- Fallback: linked cover. Shown until the embed has actually rendered. -->
    <a
      v-show="state !== 'embedded'"
      :href="reel.postUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="group relative block w-full overflow-hidden rounded-sm"
      data-reel-fallback
    >
      <IgImage :photo="reel" sizes="(min-width: 640px) 15rem, 9.5rem" class="aspect-[9/16] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      <span
        class="absolute inset-x-2 bottom-2 flex items-center justify-center gap-2 rounded-md bg-nc-ink/85 px-2 py-2 text-center text-xs font-semibold text-white backdrop-blur-sm group-hover:bg-nc-red sm:px-3 sm:py-2.5 sm:text-sm"
      >
        <IconInstagram class="h-4 w-4 shrink-0" />
        <span>Watch on Instagram</span>
      </span>
      <span class="sr-only">(opens Nino’s Reel on Instagram in a new tab)</span>
    </a>

    <!-- Official embed host: laid out (so the iframe can measure) but hidden until rendered. -->
    <div
      ref="host"
      :class="state === 'embedded' ? 'col-span-2 w-full' : 'pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0'"
      :aria-hidden="state === 'embedded' ? undefined : 'true'"
    />

    <figcaption :class="['text-caption text-nc-mist', state === 'embedded' ? 'col-span-2 mt-3' : 'sm:mt-3']">
      <p class="text-[0.9375rem] leading-snug font-medium text-white">“{{ reel.caption }}”</p>
      <p class="mt-1">From Nino’s Reel, {{ formatPostDate(reel.postDate) }}</p>
      <a
        v-if="state === 'embedded'"
        :href="reel.postUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-nc-red-bright hover:underline"
      >
        Watch on Instagram
        <svg aria-hidden="true" viewBox="0 0 16 16" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 11 11 5M6 5h5v5" /></svg>
        <span class="sr-only">(opens the Reel in a new tab)</span>
      </a>
    </figcaption>
  </figure>
</template>
