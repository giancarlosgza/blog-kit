import type { ISeriesListResponse } from '#blog/shared/types/api'

/**
 * Series names by slug from the cached `/api/blog/series`, shared by every post card
 * (`seriesSlug` is all a post stores). Unknown slugs resolve to `null`, hiding the badge.
 */
export function useSeriesNames() {
  const { data } = useCachedResource<ISeriesListResponse['series']>(
    'blog-series-names',
    async () => (await $fetch<ISeriesListResponse>('/api/blog/series')).series
  )

  const names = computed(() => new Map((data.value ?? []).map(series => [series.slug, series.name])))

  function seriesName(slug: string | null | undefined): string | null {
    return slug ? names.value.get(slug) ?? null : null
  }

  return { seriesName }
}
