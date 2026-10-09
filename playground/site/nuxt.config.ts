/**
 * Standalone blog on the site layer (blog at `/`), for developing the layers. A real blog site looks
 * the same: `extends` the site layer, sets its brand in `app/app.config.ts` and points `.env` at its
 * Firebase project.
 */
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
