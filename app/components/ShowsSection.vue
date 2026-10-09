<script setup lang="ts">
import { media } from '~/data/media'
</script>

<template>
  <section id="shows" aria-labelledby="shows-title">
    <div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div class="max-w-2xl">
        <p class="eyebrow">Shows &amp; livestreams</p>
        <h2 id="shows-title" class="mt-3 font-display text-3xl leading-tight text-nc-black uppercase sm:text-5xl">
          Catch Nino at the table — or on a live.
        </h2>
        <p class="mt-4 text-lg text-nc-ink/85">
          Dates change, so they aren’t listed here. Upcoming vendor events and Whatnot shows get
          announced on Instagram — check the latest posts and stories before you head out or tune in.
        </p>
      </div>

      <div class="mt-12 grid gap-6 md:grid-cols-2">
        <article class="flex flex-col overflow-hidden rounded-3xl border border-nc-line bg-white shadow-sm">
          <div class="p-3 pb-0">
            <MediaSlot :item="media.vendorEvent" aspect="aspect-[16/10]" />
          </div>
          <div class="flex flex-1 flex-col p-6 sm:p-8">
            <span class="inline-flex w-fit items-center gap-2 rounded-full bg-nc-red/10 px-3 py-1 text-xs font-bold tracking-wider text-nc-red-dark uppercase">
              In person
            </span>
            <h3 class="mt-4 font-display text-2xl text-nc-black uppercase">Card shows &amp; vendor events</h3>
            <p class="mt-2 flex-1 text-nc-ink/80">
              Nino sets up a vendor table at card events. Come dig through cards, talk the hobby and
              make a deal in person. Where and when is posted on Instagram.
            </p>
            <InstagramButton variant="dark" class="mt-6 self-start">Find the next event</InstagramButton>
          </div>
        </article>

        <article class="flex flex-col overflow-hidden rounded-3xl bg-nc-black text-white">
          <div class="p-3 pb-0">
            <MediaSlot :item="media.livestream" aspect="aspect-[16/10]" dark />
          </div>
          <div class="flex flex-1 flex-col p-6 sm:p-8">
            <span class="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wider text-white uppercase">
              <span aria-hidden="true" class="h-2 w-2 rounded-full bg-nc-red" />
              Live on Whatnot
            </span>
            <h3 class="mt-4 font-display text-2xl uppercase">Whatnot shows</h3>
            <p class="mt-2 flex-1 text-white/80">
              Nino goes live on Whatnot — past streams have included a lunch show. When the next
              one’s on, the time and the stream link are shared on Instagram.
            </p>
            <InstagramButton class="mt-6 self-start">Get the next show link</InstagramButton>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
