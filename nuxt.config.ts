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
  // Server-only settings, each from an env var. None are sent to the browser.
  //   NUXT_SESSION_SECRET      seals session cookies and Square tokens
  //   NUXT_ADMIN_SETUP_CODE    one-time code Nino enters to create the owner account
  //   NUXT_ADMIN_DEMO          1 = demo mode (in-memory SAMPLE data only)
  //   NUXT_SQUARE_APP_ID / NUXT_SQUARE_APP_SECRET / NUXT_SQUARE_ENV / NUXT_SQUARE_REDIRECT_URL
  // Storage: REDIS_URL (or KV_URL), read directly by server/plugins/admin-storage.ts.
  //   JUSTTCG_API_KEY (or NUXT_JUSTTCG_API_KEY)  card search + market prices for /scan
  //   NUXT_PUBLIC_BUY_RATE                       percent of market reference offered (default 60%)
  runtimeConfig: {
    sessionSecret: '',
    adminDemo: '',
    adminSetupCode: '',
    square: { appId: '', appSecret: '', env: '', redirectUrl: '' },
    justtcgApiKey: '',
    public: {
      // Same buy rate the TCG Buy Calculator is configured with (data/config.json).
      buyRate: '60%',
      // Prices older than this are never used for an estimate.
      staleThresholdDays: 7,
    },
  },

})
