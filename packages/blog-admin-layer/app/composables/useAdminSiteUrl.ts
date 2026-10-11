/**
 * The admin's own origin, no trailing slash: the site config URL (`NUXT_SITE_URL` or
 * `NUXT_PUBLIC_SITE_URL` at runtime, else `site.url`), then `runtimeConfig.public.siteUrl`.
 */
export function useAdminSiteUrl(): string {
  return String(useSiteConfig().url || useRuntimeConfig().public.siteUrl || '').replace(/\/+$/, '')
}
