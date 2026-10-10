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
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icon-512.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  // Nitro picks the `vercel` preset automatically when built on Vercel.
  // Run `NITRO_PRESET=vercel npm run build` to reproduce that output locally.
  typescript: {
    strict: true,
  },
  // Admin records and uploads are mounted at runtime in server/plugins/admin-storage.ts.
  // Server-only secrets. Each maps to an env var: NUXT_SESSION_SECRET,
  // NUXT_ADMIN_PASSWORD_HASH, NUXT_ADMIN_DEMO, NUXT_SQUARE_APP_ID,
  // NUXT_SQUARE_APP_SECRET, NUXT_SQUARE_ENV, NUXT_SQUARE_REDIRECT_URL,
  // NUXT_SQUARE_ACCESS_TOKEN, NUXT_SQUARE_LOCATION_ID. None reach the client.
  runtimeConfig: {
    sessionSecret: '',
    adminPasswordHash: '',
    adminDemo: '',
    // Optional one-time code required to create the owner account (NUXT_ADMIN_SETUP_CODE).
    adminSetupCode: '',
    square: { appId: '', appSecret: '', env: '', redirectUrl: '', accessToken: '', locationId: '' },
  },
})
