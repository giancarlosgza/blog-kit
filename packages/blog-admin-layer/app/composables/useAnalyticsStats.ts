import type { AggregateStats } from '#admin/shared/types/stats/aggregate'
import type { PlausibleDashboardResponse } from '#admin/shared/types/stats/dashboard'
import type { DateRangePeriod } from '#admin/shared/types/stats/date-range'
import { useFirebaseAuth } from 'vuefire'

const DEFAULT_AGGREGATE: AggregateStats = {
  bounce_rate: { value: null, change: null },
  pageviews: { value: null, change: null },
  visit_duration: { value: null, change: null },
  visitors: { value: null, change: null },
  visits: { value: null, change: null }
}

/**
 * Fetches Plausible analytics stats through the server via SSR-compatible useFetch.
 * Session cookie handles auth automatically during SSR and client navigation.
 */
export function useAnalyticsStats(period: Ref<DateRangePeriod>) {
  const auth = useFirebaseAuth()

  const { data, pending: isLoading, error: fetchError, refresh } = useFetch<PlausibleDashboardResponse>('/api/analytics/plausible', {
    query: computed(() => ({ period: period.value })),
    async onRequest({ options }) {
      const user = auth?.currentUser
      if (user) {
        const token = await user.getIdToken()
        options.headers = new Headers(options.headers as HeadersInit)
        ;(options.headers as Headers).set('Authorization', `Bearer ${token}`)
      }
    },
    default: () => ({
      breakdownStats: [],
      browserBreakdown: [],
      referrerBreakdown: [],
      aggregateStats: { ...DEFAULT_AGGREGATE },
      timeStats: [],
      realtimeStats: 0,
      channelBreakdown: [],
      countryBreakdown: [],
      referralLandingBreakdown: [],
      failures: []
    })
  })

  const error = computed(() => {
    if (fetchError.value)
      return 'Analytics failed to load.'

    if (data.value?.failures?.length)
      return `Some analytics failed to load: ${data.value.failures.join(', ')}`

    return null
  })

  const breakdownStats = computed(() => data.value?.breakdownStats ?? [])
  const browserBreakdown = computed(() => data.value?.browserBreakdown ?? [])
  const referrerBreakdown = computed(() => data.value?.referrerBreakdown ?? [])
  const aggregateStats = computed(() => data.value?.aggregateStats ?? { ...DEFAULT_AGGREGATE })
  const timeStats = computed(() => data.value?.timeStats ?? [])
  const realtimeStats = computed(() => data.value?.realtimeStats ?? 0)
  const channelBreakdown = computed(() => data.value?.channelBreakdown ?? [])
  const countryBreakdown = computed(() => data.value?.countryBreakdown ?? [])
  const referralLandingBreakdown = computed(() => data.value?.referralLandingBreakdown ?? [])

  return {
    isLoading,
    error,
    breakdownStats,
    browserBreakdown,
    referrerBreakdown,
    aggregateStats,
    timeStats,
    realtimeStats,
    channelBreakdown,
    countryBreakdown,
    referralLandingBreakdown,
    refresh
  }
}
