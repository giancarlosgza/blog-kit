/**
 * A landing page with the blog embedded at `/blog`: it extends only the blog layer and keeps its
 * own app shell (app.vue, layout, header and footer). The site loads `@colorffy/css` itself.
 */
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
