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

- **Source:** the Instagram profile (NINO, Buying and Selling) and its visible posts are the only source.
- **Contact:** Instagram is the only contact channel. Every Instagram link uses `site.instagramUrl` in `app/data/site.ts`.
- **Not on the page:** no stock, prices, grades, shipping, payment methods, guarantees, event dates or recurring schedules. Visitors are sent to Instagram for current cards, shows and Whatnot links.
- **Photos:** placeholders are clearly labeled. Add the account's own photos and logo in `public/media/`, then set `src` for each slot in `app/data/media.ts` (see `public/media/README.md`).

## Structure

```
app/app.vue                 page shell, skip link
app/components/             header, the five sections, footer, MediaSlot, InstagramButton
app/data/site.ts            name, handle, Instagram URL, nav
app/data/media.ts           photo/logo slots (null = labeled placeholder)
app/assets/css/main.css     Tailwind + red/black/white theme tokens
```
