import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  modules: ['@pinia/nuxt'],

  css: ['assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  nitro: {
    preset: 'node-server',
  },

  routeRules: {
    '/': { redirect: '/login' },
  },

  devtools: { enabled: false },
})
