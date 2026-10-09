/** Landing page with the blog at `/blog` */
export default defineNuxtConfig({
  extends: ['@giancarlosgza/blog-layer'],

  devtools: { enabled: true },
  compatibilityDate: '2026-01-01',

  devServer: {
    port: 3031
  },

  blog: {
    basePath: '/blog'
  },

  css: [
    '@/assets/scss/main.scss',
    '@/assets/css/material-symbols.generated.css'
  ],

  site: {
    url: process.env.NUXT_SITE_URL || 'https://example.com',
    name: 'Landing Playground'
  }
})
