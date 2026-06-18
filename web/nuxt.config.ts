export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],

  // SPA mode — credentials live only in memory, no SSR hydration issues
  ssr: false,

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    config: {
      darkMode: 'class',
    },
  },

  pinia: {
    storesDirs: ['./stores/**'],
  },

  nitro: {
    preset: 'node-server',
  },

  devtools: { enabled: false },
})
