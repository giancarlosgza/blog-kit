import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import blogModule from './blog-module'

const layerDir = dirname(fileURLToPath(import.meta.url))

/**
 * Blog layer: Firestore-backed blog pages mounted under `blog.basePath` (see `blog-module.ts`),
 * cached read endpoints under `/api/blog/*`, RSS, sitemap source and per-page SEO. It can be added
 * to any Nuxt site that already loads `@colorffy/css`; for a standalone blog, extend
 * `@giancarlosgza/blog-site-layer` instead, which adds the app shell around it.
 *
 * Inside the layer, import its own files through `#blog/...`: `~` and `#shared` resolve to the site.
 */
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',

  alias: {
    '#blog': layerDir
  },

  // Blog pages are registered by the module, so the router must be on even without a pages/ dir
  pages: true,

  blog: {
    basePath: '/'
  },

  nitro: {
    // In-memory dev cache for the cached endpoints (the fs driver breaks on Windows with ?query keys)
    devStorage: {
      cache: { driver: 'memory' }
    }
  },

  runtimeConfig: {
    siteUrl: '',

    public: {
      blog: {
        basePath: '/'
      }
    }
  },

  css: [join(layerDir, 'app/assets/scss/main.scss')],

  modules: [
    blogModule,
    '@colorffy/ui/nuxt',
    'nuxt-og-image',
    '@nuxt/image',
    '@nuxtjs/color-mode',
    '@nuxtjs/sitemap',
    '@vueuse/nuxt'
  ],

  // SEO
  sitemap: {
    sources: ['/api/blog/_sitemap-urls']
  },

  // Color mode (@colorffy/css dark tokens hang off `.dark-mode`)
  colorMode: {
    preference: 'system',
    classSuffix: '-mode'
  },

  // Image
  image: {
    provider: 'ipx',
    presets: {
      logo: {
        modifiers: {
          format: 'webp',
          quality: 50
        }
      },
      cover: {
        modifiers: {
          format: 'webp',
          quality: 70
        }
      }
    }
  }
})
