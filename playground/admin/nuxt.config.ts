/** Blog admin on the admin layer */
export default defineNuxtConfig({
  extends: ['@giancarlosgza/blog-admin-layer'],

  devtools: { enabled: true },
  compatibilityDate: '2026-01-01',

  devServer: {
    port: 3032
  },

  runtimeConfig: {
    public: {
      blogUrl: process.env.NUXT_BLOG_URL || 'http://localhost:3030',
      siteUrl: process.env.NUXT_SITE_URL || 'http://localhost:3032'
    }
  },

  css: ['@/assets/css/material-symbols.generated.css'],

  site: {
    url: process.env.NUXT_SITE_URL || 'https://admin.example.com',
    name: 'Blog Admin Playground'
  },

  pwa: {
    manifest: {
      name: 'Blog Admin Playground',
      short_name: 'Admin',
      theme_color: '#ffffff',
      background_color: '#ffffff'
    },
    workbox: {
      cacheId: 'blog-admin-playground'
    }
  }
})
