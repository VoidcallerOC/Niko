<script setup lang="ts">
import { feed } from '~/data/media'

const [feature, ...rest] = feed
</script>

<template>
  <section id="feed" aria-labelledby="feed-title" class="bg-nc-coal/80">
    <div class="wrap section-pad">
      <!-- Intro + feature image -->
      <div class="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div class="lg:col-span-5">
          <p class="eyebrow">From the feed</p>
          <h2 id="feed-title" class="mt-3 text-title">Recent pulls, deals and pack rips</h2>
          <p class="mt-4 max-w-md text-nc-mist">
            A handful of Nino’s Instagram posts, mostly One Piece and Pokémon. These are past posts,
            not a stock list, so ask Nino what’s available before you count on a card.
          </p>
          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <LinkButton to="instagram" block>Ask about a card</LinkButton>
            <LinkButton to="instagram" variant="outline-light" block>Selling? Send photos</LinkButton>
          </div>
        </div>

        <figure v-if="feature" class="lg:col-span-7">
          <div class="overflow-hidden rounded-sm bg-nc-ink">
            <IgImage
              :photo="feature"
              sizes="(min-width: 1024px) 56vw, 100vw"
              class="aspect-[5/4] w-full object-cover object-[50%_40%]"
            />
          </div>
          <FeedCaption :photo="feature" />
        </figure>
      </div>

      <!-- Five-up strip: tops aligned so captions line up; last tile goes full width on phones -->
      <ul role="list" class="mt-10 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:mt-16 lg:grid-cols-5 lg:gap-x-6">
        <li
          v-for="(photo, i) in rest"
          :key="photo.id"
          :class="i === rest.length - 1 && rest.length % 2 === 1 ? 'col-span-2 md:col-span-1' : ''"
        >
          <figure>
            <div class="overflow-hidden rounded-sm bg-nc-ink">
              <IgImage
                :photo="photo"
                sizes="(min-width: 1024px) 20vw, 50vw"
                :class="[
                  'w-full object-cover transition-transform duration-500 hover:scale-[1.03]',
                  i === rest.length - 1 && rest.length % 2 === 1 ? 'aspect-[4/3] md:aspect-[3/4]' : 'aspect-[3/4]',
                ]"
              />
            </div>
            <FeedCaption :photo="photo" />
          </figure>
        </li>
      </ul>
    </div>
  </section>
</template>
