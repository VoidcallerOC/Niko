<script setup lang="ts">
import { logo, photos } from '~/data/media'
import { site } from '~/data/site'

const lunch = photos.whatnotLunch
</script>

<template>
  <section id="live" aria-labelledby="live-title" class="bg-nc-coal/80">
    <div class="wrap section-pad">
      <div class="grid gap-8 lg:grid-cols-12">
        <div class="lg:col-span-4">
          <p class="eyebrow">Live shows &amp; updates</p>
          <h2 id="live-title" class="mt-3 text-subtitle">More ways to catch Nino</h2>
          <p class="mt-3 max-w-sm text-nc-mist">
            Live-show times and new posts are shared on Instagram.
          </p>
        </div>

        <ul role="list" class="divide-y divide-nc-rule border-y border-nc-rule lg:col-span-8">
          <li>
            <a
              :href="site.instagramUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="group grid grid-cols-[5rem_1fr] items-start gap-4 py-5 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-6"
            >
              <IgImage :photo="lunch" sizes="7rem" class="aspect-square w-full rounded-sm object-cover" />
              <span>
                <span class="block font-display text-2xl leading-tight font-bold">Whatnot shows</span>
                <span class="mt-1 block text-[0.9375rem] text-nc-mist">
                  Nino has gone live on Whatnot, including a lunch show in September. When the next one’s
                  on, the time and link are posted on Instagram.
                </span>
                <span class="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-nc-red-bright group-hover:underline">Get show updates <span aria-hidden="true" class="transition-transform group-hover:translate-x-0.5">→</span></span>
              </span>
              <span class="sr-only">(opens {{ site.handle }} on Instagram in a new tab)</span>
            </a>
          </li>
          <li>
            <a
              :href="site.instagramUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="group grid grid-cols-[5rem_1fr] items-start gap-4 py-5 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-6"
            >
              <span class="grid aspect-square w-full place-items-center rounded-sm bg-nc-ink">
                <picture>
                  <source :srcset="logo.emblem.srcset" sizes="5rem" type="image/webp">
                  <img :src="logo.emblem.fallback" alt="" width="256" height="256" class="h-16 w-16 sm:h-20 sm:w-20">
                </picture>
              </span>
              <span>
                <span class="block font-display text-2xl leading-tight font-bold">New pulls and deals</span>
                <span class="mt-1 block text-[0.9375rem] text-nc-mist">
                  Pulls, deals and photos from the table land on {{ site.handle }}. Follow along to
                  catch them.
                </span>
                <span class="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-nc-red-bright group-hover:underline">Follow on Instagram <span aria-hidden="true" class="transition-transform group-hover:translate-x-0.5">→</span></span>
              </span>
              <span class="sr-only">(opens {{ site.handle }} on Instagram in a new tab)</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
