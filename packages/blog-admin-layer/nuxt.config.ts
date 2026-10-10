import type { Nuxt } from 'nuxt/schema'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const layerDir = dirname(fileURLToPath(import.meta.url))
const shellCss = [
  join(layerDir, 'app/assets/scss/integrations.scss'),
  join(layerDir, 'app/assets/scss/main.scss')
]

// blog-core helpers, auto-imported like the layer's own utils
const coreImports = [{
  from: '@giancarlosgza/blog-core',
  imports: ['htmlToExcerpt', 'joinBlogPath', 'normalizeBasePath', 'resolveAuthorName', 'resolvePostSeo', 'SEO_DESCRIPTION_MAX', 'SEO_TITLE_MAX', 'toBlogUrl', 'toDateMs', 'toSlug']
}]

const toPosix = (path: string) => path.replace(/\\/g, '/')

/** CSS order: framework and admin styles, other layers, then the site, so brand tokens win */
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

/** Blog admin layer */
export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: '2026-01-01',

  alias: {
    '#admin': layerDir
  },

  imports: {
    presets: coreImports
  },

  nitro: {
    imports: {
      presets: [...coreImports, { from: '@giancarlosgza/blog-core/sanitize', imports: ['sanitizePostHtml'] }]
    },
    preset: 'node-server',
    compressPublicAssets: true
  },

  runtimeConfig: {
    geminiKey: '',
    plausibleToken: '',
    public: {
      blogUrl: '',
      plausibleBaseUrl: '',
      plausibleBaseUrlV2: '',
      plausibleSiteId: '',
      siteUrl: '',
      appVersion: process.env.npm_package_version
    }
  },
  routeRules: {
    '/posts/**': { ssr: false },
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      }
    }
  },

  experimental: {
    viewTransition: true
  },

  vite: {
    optimizeDeps: {
      // Installed layers sit in node_modules, where Vite does not discover deps: pre-bundle the
      // CommonJS sanitize-html chain behind the client-side preview sanitizer
      include: ['@giancarlosgza/blog-admin-layer > @giancarlosgza/blog-core/sanitize'],
      // One vuefire instance: with pnpm, nuxt-vuefire's plugin and the layer would otherwise get separate copies
      exclude: ['vuefire']
    }
  },
  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
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
    'nuxt-vuefire',
    '@colorffy/ui/nuxt',
    '@nuxt/fonts',
    '@nuxtjs/color-mode',
    '@nuxtjs/robots',
    '@nuxtjs/sitemap',
    '@vite-pwa/nuxt',
    '@vueuse/nuxt'
  ],

  // SEO
  site: {
    defaultLocale: 'en',
    indexable: false
  },
  robots: {
    disallow: ['/*'],
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

  // Color mode
  colorMode: {
    preference: 'system',
    classSuffix: '-mode'
  },

  // Firebase (web config from NUXT_PUBLIC_VUEFIRE_CONFIG_*)
  vuefire: {
    emulators: {
      enabled: process.env.NODE_ENV !== 'production'
    },
    auth: {
      enabled: true,
      sessionCookie: true
    },
    config: {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      appId: ''
    }
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

  // PWA (sites add manifest and cacheId)
  pwa: {
    registerType: 'autoUpdate',
    workbox: {
      navigateFallback: '/',
      cleanupOutdatedCaches: true,
      globPatterns: ['**/*.{js,css,html,png,svg,jpg,ico,woff2}'],
      globIgnores: ['**/material-symbols-rounded-full.woff2']
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module'
    }
  }
})
