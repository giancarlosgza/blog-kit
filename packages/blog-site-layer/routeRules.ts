export const routeRules = {
  // -----------------------------------------------------
  // GLOBAL SECURITY HEADERS
  // -----------------------------------------------------
  '/**': {
    headers: {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()'
    }
  },

  // -----------------------------------------------------
  // STATIC ASSETS (1 Year Cache for SEO Content)
  // -----------------------------------------------------
  '/seo/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  '/images/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  '/assets/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  '/icon-fonts/**': { headers: { 'cache-control': 'public, max-age=86400, stale-while-revalidate=604800' } }

  // Blog page cache rules are added by the blog layer's module under `blog.basePath`
} as const
