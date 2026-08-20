import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  app: {
    head: {
      title: 'Contract Finder',
      titleTemplate: '%s · Contract Finder',
    },
  },

  modules: ['@pinia/nuxt'],

  css: ['assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  nitro: {
    preset: 'node-server',
  },

  devtools: { enabled: false },
})
