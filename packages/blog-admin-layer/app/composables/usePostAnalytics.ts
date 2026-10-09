import type { PostAnalyticsRange, PostAnalyticsResponse, TopPostsResponse } from '#admin/shared/types/stats/post'
import { useFirebaseAuth } from 'vuefire'
import { DEFAULT_POST_ANALYTICS_RANGE } from '#admin/shared/utils/post-analytics'

/** Range shared by the editor performance card and the dashboard top posts card. */
export function useAnalyticsRange() {
  return useState<PostAnalyticsRange>('analytics-range', () => DEFAULT_POST_ANALYTICS_RANGE)
}

function analyticsErrorMessage(err: unknown): string | null {
  if (!err)
    return null
  const error = err as { data?: { statusMessage?: string }, statusMessage?: string } | null
  return error?.data?.statusMessage || error?.statusMessage || 'Analytics failed to load.'
}

/**
 * Plausible stats for one post over the shared range, fetched client-side only.
 * Nothing is requested while `enabled` is false (unpublished posts have no traffic).
 */
export function usePostAnalytics(slug: Ref<string>, enabled: Ref<boolean>) {
  const apiFetch = useApiFetch()
  const range = useAnalyticsRange()

  const { data, status, error, refresh } = useAsyncData(
    () => `post-analytics:${slug.value}:${range.value}:${enabled.value}`,
    () => (enabled.value && slug.value
      ? apiFetch<PostAnalyticsResponse>('/api/analytics/post', { query: { slug: slug.value, range: range.value } })
      : Promise.resolve(null)),
    { server: false }
  )

  const isLoading = computed(() => enabled.value && (status.value === 'pending' || status.value === 'idle'))
  const errorMessage = computed(() => analyticsErrorMessage(error.value))

  return { range, data, isLoading, errorMessage, refresh }
}

/**
 * Top published posts by views over the shared range. `useFetch` forwards the session cookie
 * during SSR, so the dashboard renders it with the page; client refetches send a Bearer token.
 */
export function useTopPosts() {
  const auth = useFirebaseAuth()
  const range = useAnalyticsRange()

  const { data, status, error, refresh } = useFetch<TopPostsResponse>('/api/analytics/top-posts', {
    query: computed(() => ({ range: range.value })),
    async onRequest({ options }) {
      const user = auth?.currentUser
      if (user) {
        const token = await user.getIdToken()
        options.headers = new Headers(options.headers as HeadersInit)
        ;(options.headers as Headers).set('Authorization', `Bearer ${token}`)
      }
    }
  })

  const isLoading = computed(() => status.value === 'pending' || status.value === 'idle')
  const errorMessage = computed(() => analyticsErrorMessage(error.value))

  return { range, data, isLoading, errorMessage, refresh }
}
