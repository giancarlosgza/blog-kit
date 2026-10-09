import type { Nuxt } from 'nuxt/schema'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { routeRules } from './routeRules'

const layerDir = dirname(fileURLToPath(import.meta.url))
const shellCss = [
  join(layerDir, 'app/assets/scss/integrations.scss'),
  join(layerDir, 'app/assets/scss/main.scss')
]

const toPosix = (path: string) => path.replace(/\\/g, '/')

/**
 * Merged configs list the site's `css` before the layers'. Reorder to framework (this layer), then
 * the other layers (the blog styles), then the site, so brand tokens declared by the site in the
 * same cascade layers (later in source order) override the framework defaults.
 */
function shellStylesFirst(_options: unknown, nuxt: Nuxt) {
  nuxt.hook('modules:done', () => {
    const layerDirs = nuxt.options._layers
      .map(layer => toPosix(layer.config.rootDir))
      .filter(dir => dir !== toPosix(nuxt.options.rootDir))
    const fromLayer = (entry: string) => layerDirs.some(dir => toPosix(entry).startsWith(dir))
    const rest = nuxt.options.css.filter(entry => !shellCss.includes(entry))

    nuxt.options.css = [...shellCss, ...rest.filter(fromLayer), ...rest.filter(entry => !fromLayer(entry))]
  })
}

/**
 * Standalone blog site: the blog layer plus the app shell (app.vue, error page, default layout,
 * navbar/footer, cookie banner, PWA, robots, fonts, analytics) and the `@colorffy/css` framework.
 * The site that extends it supplies the brand (`app.config.ts`), head meta, fonts, PWA manifest and
 * public assets, and can replace TheNavbar/TheFooter with components of the same name.
 */
export default defineNuxtConfig({
  extends: ['@giancarlosgza/blog-layer'],

  ssr: true,
  compatibilityDate: '2026-01-01',

  alias: {
    '#blog-site': layerDir
  },

  experimental: {
    viewTransition: true,
    payloadExtraction: false
  },
  nitro: {
    preset: 'node-server',
    compressPublicAssets: true
  },

  runtimeConfig: {
    siteName: '',

    public: {
      plausibleScriptId: '',
      plausibleDomain: '',
      plausibleScript: '',
      appVersion: process.env.npm_package_version
    }
  },
  routeRules,

  app: {
    pageTransition: false,
    layoutTransition: false,
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'twitter:card', key: 'twitter:card', content: 'summary_large_image' }
      ],
      htmlAttrs: {
        lang: 'en'
      },
      link: [
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: '/icon-fonts/material-symbols-rounded-subset.woff2',
          crossorigin: 'anonymous'
        }
      ]
    }
  },

  css: shellCss,

  modules: [
    shellStylesFirst,
    '@nuxt/fonts',
    '@nuxt/scripts',
    '@nuxtjs/robots',
    '@vite-pwa/nuxt'
  ],

  // SEO
  site: {
    defaultLocale: 'en',
    trailingSlash: false
  },
  robots: {
    disallow: [
      '/*?*tag=*',
      '/*?*ref=*'
    ],
    sitemap: '/sitemap.xml'
  },
  sitemap: {
    xslColumns: [
      { label: 'URL', width: '50%' },
      { label: 'Last Modified', select: 'sitemap:lastmod', width: '25%' },
      { label: 'Priority', select: 'sitemap:priority', width: '12.5%' },
      { label: 'Change Frequency', select: 'sitemap:changefreq', width: '12.5%' }
    ]
  },

  // Fonts (sites add their own families)
  fonts: {
    assets: {
      prefix: '/fonts/'
    },
    families: [
      { name: 'Material Symbols Rounded', provider: 'none' },
      { name: 'DM Sans', provider: 'none' },
      { name: 'Plus Jakarta Sans', provider: 'none' }
    ],
    defaults: {
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      preload: false
    },
    processCSSVariables: 'font-prefixed-only'
  },

  // PWA (sites add the manifest, `workbox.cacheId` and runtime caching)
  pwa: {
    registerType: 'prompt',
    workbox: {
      navigateFallback: null,
      cleanupOutdatedCaches: true,
      globPatterns: ['**/*.{js,css,html,woff2}'],
      globIgnores: ['**/material-symbols-rounded-full.woff2'],
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600
    },
    devOptions: {
      enabled: false,
      suppressWarnings: true,
      type: 'module'
    }
  }
})
