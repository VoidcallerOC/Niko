# Nino’s Collectibles — homepage concept

A single-page homepage **preview** for [@ninoscollectibles](https://www.instagram.com/ninoscollectibles/).
Not published or deployed.

**Stack:** Nuxt 4 (Vue 3, TypeScript, Nitro) and Tailwind CSS v4 through `@tailwindcss/vite`.

**Owner admin (preview):** a private area at `/admin` for inventory, scanning, events, Instagram and
Square controls, and site settings. See [docs/ADMIN.md](docs/ADMIN.md) for what it does, how sign-in
works, what was reused from other projects, and what Nick must set in Vercel first. Run it locally with
`NUXT_ADMIN_DEMO=1 npm run dev` (password `demo-nino`, labelled sample data only).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm test           # parser tests for the OnTreasure show loader
npm run build      # Nitro output in .output/
```

Working offline? `NUXT_TREASURE_SHOWS_FIXTURE=/path/to/result.json npm run dev` serves the shows
section from a saved `TreasureResult` instead of calling OnTreasure. Never set it on Vercel.

**Vercel:** `vercel.json` sets the framework to Nuxt. On Vercel, Nitro uses its `vercel` preset automatically. To reproduce that output locally, run `NITRO_PRESET=vercel npm run build`.

## Content rules

- **Logo:** official artwork supplied by Nick (Oct 10, 2026), in `public/media/brand/`. The favicons are generated from the NC emblem.
- **Sources:** the public Instagram profile (NINO, Buying and Selling) and its posts. Every photo on the page comes from a public post and is stored in `public/media/ig/`. For each photo, `app/data/media.ts` records the source post URL, post date, verbatim caption and alt text.
- **Contact:** Instagram is the primary contact (`site.instagramUrl`). The "Find Nino at a show" button goes to his OnTreasure vendor profile (`site.onTreasureUrl`). The page lists no event dates.
- **Not on the page:** no stock, prices, grades, shipping, payment methods or guarantees. Pictured cards are labeled as past posts. Two photos were left out on purpose: one shows price tags that couldn't be cropped out cleanly (the Whatnot lunch-show close-up), and one shows a young private individual (`Dc9MbLkyc7A`). The hero photo is cropped to remove price labels on the table.

## Typography

- Display: Barlow Condensed 700/800 (800 italic only in the hero). Text: Inter (variable).
- Both fonts are self-hosted from npm (`@fontsource/barlow-condensed`, `@fontsource-variable/inter`), so the page makes no font requests to Google.
- The type scale is defined as `@theme` tokens in `app/assets/css/main.css`: `text-hero`, `text-title`, `text-subtitle`, `text-lede` and `text-caption`.

## Upcoming shows (OnTreasure)

`server/utils/treasureShows.ts` is adapted from Thousand Sunny's `src/lib/treasure-shows.ts`: it reads
Nino's public OnTreasure profile, calls OnTreasure's own `getUserEventsDisplayData` server action for the
Vending tab, parses the event objects, drops anything already past (America/New_York) and caches for
five minutes. `server/api/shows.get.ts` exposes the result; `ShowsSection.vue` renders it on the server
(so the events are in the HTML, with matching `Event` JSON-LD) and refreshes in the browser every five
minutes. If OnTreasure can't be reached the section says so and links to the profile. Nothing about an
event is written by hand.

## Starfield

`StarField.vue` draws a fixed, full-viewport canvas behind the page: three depth layers of small stars,
slow drift, light twinkle on a few, pointer parallax on fine-pointer devices only. It renders one static
frame under `prefers-reduced-motion`, pauses when the tab is hidden, runs at ~30fps on touch devices,
is `aria-hidden` and never receives pointer events. Section backgrounds are slightly translucent so the
stars show through.

## Reel embed

`ReelEmbed.vue` renders Nino's Reel as a linked cover on the server. In the browser it then tries Instagram's official `embed.js` and swaps in the embed only once Instagram reports it has rendered. If the script errors or doesn't render within 10 seconds, the linked cover stays. The embed never autoplays.

## Structure

```
app/app.vue                 page shell, skip link
app/components/             header, hero, feed, shows, updates, about, contact, footer, StarField, ReelEmbed
server/utils/treasureShows.ts  OnTreasure show loader (adapted from Thousand Sunny)
server/api/shows.get.ts     JSON endpoint used by ShowsSection
tests/                      node:test suite + sanitized OnTreasure profile fixture
app/data/site.ts            name, handle, Instagram + OnTreasure URLs, nav
app/data/media.ts           Instagram photos + logo with source post, caption, alt
public/media/ig/            locally stored WebP images (no CDN hotlinks)
app/assets/css/main.css     Tailwind theme tokens built from the NC logo
```
