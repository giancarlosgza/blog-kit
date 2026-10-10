/**
 * Injects the site-wide `Organization` and `WebSite` JSON-LD into every page.
 *
 * Both nodes carry a stable `@id` so per-page structured data (`BlogPosting`,
 * breadcrumbs, etc.) can reference them via `publisher`/`@id` instead of
 * redefining them. No `SearchAction`: the blog has no search. Call once, in `app.vue`.
 */
export function useSiteSchemaLd() {
  const siteUrl = useSiteUrl()
  const brand = useAppConfig().blog
  const organizationId = `${siteUrl}/#organization`
  const websiteId = `${siteUrl}/#website`

  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId,
    'name': brand.organization.name || brand.name,
    'url': brand.organization.url || siteUrl,
    'logo': {
      '@type': 'ImageObject',
      'url': `${siteUrl}/pwa-512x512.png`,
      'width': 512,
      'height': 512
    },
    ...(brand.organization.sameAs.length ? { sameAs: brand.organization.sameAs } : {})
  }

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'inLanguage': brand.locale,
    '@id': websiteId,
    'name': brand.name,
    'url': siteUrl,
    'publisher': { '@id': organizationId }
  }

  useHead({
    script: [
      { type: 'application/ld+json', innerHTML: JSON.stringify(organizationLd) },
      { type: 'application/ld+json', innerHTML: JSON.stringify(websiteLd) }
    ]
  })
}
