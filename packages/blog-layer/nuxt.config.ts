import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import blogModule from './blog-module'

const layerDir = dirname(fileURLToPath(import.meta.url))

/** Blog Layer */
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',

  alias: {
    '#blog': layerDir
  },
  pages: true,
  blog: {
    basePath: '/'
  },

  nitro: {
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

  // Color mode
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
