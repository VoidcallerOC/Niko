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

## Scan a card (`/scan`, public)

A public page where customers, and Nino at shows, scan or search a card, pick its condition and see an
estimated offer: **60%** of the current JustTCG market price (`NUXT_PUBLIC_BUY_RATE`), in whole cents.
Cards can be added to a running list ("Cards in this visit") with a total. No sign-in, no saving, no admin.

- **Forked from the TCG Buy Calculator** (`VoidcallerOC/tcg-buy-calculator@e46d63f`). The camera, image prep,
  OCR, card reading, matching and correction code is copied into `app/lib/scanner/` (a fork note on line 1; only the
  OCR asset path differs), the offer and list maths into `app/lib/pricing/`, and the engine into
  `public/scanner/tesseract/` (Tesseract.js 7, Apache-2.0, ~8.7 MB, loaded on the first capture). The UI is
  this site's own (`app/pages/scan.vue`, `app/components/scan/ScanCamera.vue`).
- **Photos never leave the phone.** OCR runs in the browser; only the text read is sent, as a search.
- **Card search + prices:** `server/api/cards.get.ts` → `server/utils/justtcg.ts` (port of the calculator's
  `api/cards.js`). Needs **`JUSTTCG_API_KEY` set on this Vercel project**; without it the page says live
  pricing isn't set up and estimates nothing. Cross-site requests are refused (JustTCG terms forbid
  re-exposing their data). At most 4 provider requests per search; identical searches are CDN-cached 5 min.
- **Never invented:** a scan is only text until the customer taps "Use this card"; two printings with one
  number always ask; prices that are missing, undated or older than 7 days give no estimate, and such
  cards are listed as "In person" and left out of the total. Condition is chosen by the customer, never
  judged from the photo.
- Tests: `npm test` (normalisation, search limits, offer maths, freshness) and
  `npm run build && npm run test:e2e:scan` (real OCR on a fake camera; needs Playwright: set
  `PLAYWRIGHT_MODULE` / `CHROMIUM` if it isn't installed).

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
