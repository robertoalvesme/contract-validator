import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // Overridable at runtime via NUXT_APP_BASE_URL (e.g. '/tools/contractvalidator/'
  // when served behind a path-prefixing reverse proxy).
  app: {
    baseURL: '/',
  },

  modules: ['@pinia/nuxt'],

  css: ['assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  nitro: {
    preset: 'node-server',
  },

  // '/' -> '/search' redirect lives in server/middleware/index-redirect.ts
  // instead of routeRules, so it can be prefixed with the runtime baseURL.

  devtools: { enabled: false },
})
