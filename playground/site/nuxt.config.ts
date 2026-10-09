/** Standalone blog at `/` */
export default defineNuxtConfig({
  extends: ['@giancarlosgza/blog-site-layer'],

  devtools: { enabled: true },
  compatibilityDate: '2026-01-01',

  devServer: {
    port: 3030
  },

  css: ['@/assets/css/material-symbols.generated.css'],

  site: {
    url: process.env.NUXT_SITE_URL || 'https://blog.example.com',
    name: 'Blog Playground'
  },

  pwa: {
    manifest: {
      name: 'Blog Playground',
      short_name: 'Blog',
      theme_color: '#ffffff',
      background_color: '#ffffff'
    },
    workbox: {
      cacheId: 'blog-playground'
    }
  }
})
