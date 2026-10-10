# Nino’s Collectibles — homepage concept

A single-page homepage **preview** for [@ninoscollectibles](https://www.instagram.com/ninoscollectibles/).
Not published or deployed.

**Stack:** Nuxt 4 (Vue 3, TypeScript, Nitro) and Tailwind CSS v4 through `@tailwindcss/vite`. No backend, database or external API.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build      # Nitro output in .output/
```

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

## Reel embed

`ReelEmbed.vue` renders Nino's Reel as a linked cover on the server. In the browser it then tries Instagram's official `embed.js` and swaps in the embed only once Instagram reports it has rendered. If the script errors or doesn't render within 10 seconds, the linked cover stays. The embed never autoplays.

## Structure

```
app/app.vue                 page shell, skip link
app/components/             header, hero, feed, shows, whatnot, about, contact, footer, IgImage, LinkButton
app/data/site.ts            name, handle, Instagram + OnTreasure URLs, nav
app/data/media.ts           Instagram photos + logo with source post, caption, alt
public/media/ig/            locally stored WebP images (no CDN hotlinks)
app/assets/css/main.css     Tailwind theme tokens built from the NC logo
```
