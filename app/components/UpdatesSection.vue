<script setup lang="ts">
import { logo, photos } from '~/data/media'
import { site } from '~/data/site'

const lunch = photos.whatnotLunch
</script>

<template>
  <section id="live" aria-labelledby="live-title" class="bg-nc-paper">
    <div class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <div class="grid gap-8 lg:grid-cols-12">
        <div class="lg:col-span-4">
          <p class="eyebrow">Live shows &amp; updates</p>
          <h2 id="live-title" class="mt-3 text-subtitle">More ways to catch Nino</h2>
          <p class="mt-3 max-w-sm text-nc-muted">
            Live-show times and new posts are shared on Instagram.
          </p>
        </div>

        <ul role="list" class="divide-y divide-nc-line border-y border-nc-line lg:col-span-8">
          <li>
            <a
              :href="site.instagramUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="group grid grid-cols-[5.5rem_1fr_auto] items-center gap-4 py-5 sm:grid-cols-[7rem_1fr_auto] sm:gap-6"
            >
              <IgImage :photo="lunch" sizes="7rem" class="aspect-square w-full rounded-sm object-cover" />
              <span>
                <span class="block font-display text-2xl leading-tight font-bold">Whatnot shows</span>
                <span class="mt-1 block text-[0.9375rem] text-nc-muted">
                  Nino has gone live on Whatnot, including a lunch show in September. When the next one’s
                  on, the time and link are posted on Instagram.
                </span>
                <span class="mt-2 block text-sm font-semibold text-nc-red-dark group-hover:underline">Get show updates</span>
              </span>
              <span aria-hidden="true" class="text-xl text-nc-ink/60 transition-transform group-hover:translate-x-1">→</span>
              <span class="sr-only">(opens {{ site.handle }} on Instagram in a new tab)</span>
            </a>
          </li>
          <li>
            <a
              :href="site.instagramUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="group grid grid-cols-[5.5rem_1fr_auto] items-center gap-4 py-5 sm:grid-cols-[7rem_1fr_auto] sm:gap-6"
            >
              <span class="grid aspect-square w-full place-items-center rounded-sm bg-nc-ink">
                <picture>
                  <source :srcset="logo.emblem.srcset" sizes="5rem" type="image/webp">
                  <img :src="logo.emblem.fallback" alt="" width="256" height="256" class="h-16 w-16 sm:h-20 sm:w-20">
                </picture>
              </span>
              <span>
                <span class="block font-display text-2xl leading-tight font-bold">New pulls and deals</span>
                <span class="mt-1 block text-[0.9375rem] text-nc-muted">
                  Pulls, deals and photos from the table land on {{ site.handle }}. Follow along to
                  catch them.
                </span>
                <span class="mt-2 block text-sm font-semibold text-nc-red-dark group-hover:underline">Follow on Instagram</span>
              </span>
              <span aria-hidden="true" class="text-xl text-nc-ink/60 transition-transform group-hover:translate-x-1">→</span>
              <span class="sr-only">(opens {{ site.handle }} on Instagram in a new tab)</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
