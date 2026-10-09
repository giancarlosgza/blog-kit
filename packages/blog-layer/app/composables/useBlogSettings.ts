import type { ISettings } from '@giancarlosgza/blog-core'
import type { ISettingsResponse } from '#blog/shared/types/api'

/**
 * Site-wide `settings/general` (branding + SEO defaults) from the cached `/api/blog/settings`.
 * One `blog-settings` state shared by the layout, navbar, footer and pages.
 */
export function useBlogSettings() {
  const { data, pending, error } = useCachedResource<ISettings | null>(
    'blog-settings',
    async () => (await $fetch<ISettingsResponse>('/api/blog/settings')).settings
  )

  return { settings: data, pending, error }
}
