import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: "Nino's Collectibles — Trading cards, bought & sold",
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            "Nino's Collectibles (@ninoscollectibles) buys and sells trading cards — Pokémon, One Piece and more. Find current cards, shows and livestreams on Instagram.",
        },
        { name: 'theme-color', content: '#111111' },
        // Concept preview only: keep it out of search indexes until approved.
        { name: 'robots', content: 'noindex, nofollow' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap',
        },
      ],
    },
  },
  // Nitro picks the `vercel` preset automatically when built on Vercel.
  // Run `NITRO_PRESET=vercel npm run build` to reproduce that output locally.
  typescript: {
    strict: true,
  },
})
