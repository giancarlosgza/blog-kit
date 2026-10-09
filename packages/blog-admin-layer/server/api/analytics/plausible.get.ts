import type { AggregateStats } from '#admin/shared/types/stats/aggregate'
import type { PlausibleDashboardResponse } from '#admin/shared/types/stats/dashboard'
import type { DateRangePeriod } from '#admin/shared/types/stats/date-range'
import type { V2AggregateResponse, V2QueryResponse } from '#admin/shared/types/stats/plausible-v2'

const DEFAULT_AGGREGATE: AggregateStats = {
  bounce_rate: { value: null, change: null },
  pageviews: { value: null, change: null },
  visit_duration: { value: null, change: null },
  visitors: { value: null, change: null },
  visits: { value: null, change: null }
}

const ALLOWED_PERIODS: DateRangePeriod[] = ['day', '7d', '28d', '30d', '91d', 'month', '6mo', '12mo', 'year', 'all']

export default defineEventHandler(async (event): Promise<PlausibleDashboardResponse> => {
  await requireStaff(event)

  const query = getQuery(event)
  const requestedPeriod = typeof query.period === 'string' ? query.period as DateRangePeriod : '30d'
  const period = ALLOWED_PERIODS.includes(requestedPeriod) ? requestedPeriod : '30d'

  const config = useRuntimeConfig(event)
  const plausibleToken = config.plausibleToken
  const siteId = config.public.plausibleSiteId
  if (!plausibleToken || !siteId || (!config.public.plausibleBaseUrl && !config.public.plausibleBaseUrlV2))
    throw createError({ statusCode: 503, statusMessage: 'Analytics is not configured.' })

  const { v1BaseUrl, v2BaseUrl } = resolvePlausibleUrls(
    config.public.plausibleBaseUrl,
    config.public.plausibleBaseUrlV2
  )

  const realtimeUrl = `${v1BaseUrl}realtime/visitors`
  const v2QueryUrl = v2BaseUrl.endsWith('/') ? v2BaseUrl.slice(0, -1) : v2BaseUrl

  const headers = {
    'Authorization': `Bearer ${plausibleToken}`,
    'Content-Type': 'application/json'
  }

  // Run the current period queries & realtime queries in parallel
  const results = await Promise.allSettled([
    $fetch<V2QueryResponse>(v2QueryUrl, {
      method: 'POST',
      headers,
      body: {
        site_id: siteId,
        metrics: ['visitors'],
        dimensions: ['event:page'],
        date_range: period,
        pagination: { limit: 10 }
      }
    }),
    $fetch<V2QueryResponse>(v2QueryUrl, {
      method: 'POST',
      headers,
      body: {
        site_id: siteId,
        metrics: ['visitors'],
        dimensions: ['visit:browser'],
        date_range: period,
        pagination: { limit: 10 }
      }
    }),
    $fetch<V2QueryResponse>(v2QueryUrl, {
      method: 'POST',
      headers,
      body: {
        site_id: siteId,
        metrics: ['visitors'],
        dimensions: ['visit:referrer'],
        date_range: period,
        pagination: { limit: 10 }
      }
    }),
    $fetch<V2AggregateResponse>(v2QueryUrl, {
      method: 'POST',
      headers,
      body: {
        site_id: siteId,
        metrics: ['visitors', 'visits', 'pageviews', 'bounce_rate', 'visit_duration', 'events'],
        date_range: period
      }
    }),
    $fetch<V2QueryResponse>(v2QueryUrl, {
      method: 'POST',
      headers,
      body: {
        site_id: siteId,
        metrics: ['visitors'],
        dimensions: ['time'],
        date_range: period
      }
    }),
    $fetch<number>(`${realtimeUrl}?site_id=${siteId}`, {
      headers: { Authorization: `Bearer ${plausibleToken}` }
    }),
    $fetch<V2QueryResponse>(v2QueryUrl, {
      method: 'POST',
      headers,
      body: {
        site_id: siteId,
        metrics: ['visitors'],
        dimensions: ['visit:channel'],
        date_range: period,
        pagination: { limit: 10 }
      }
    }),
    $fetch<V2QueryResponse>(v2QueryUrl, {
      method: 'POST',
      headers,
      body: {
        site_id: siteId,
        metrics: ['visitors'],
        dimensions: ['visit:country_name'],
        date_range: period,
        pagination: { limit: 10 }
      }
    }),
    $fetch<V2QueryResponse>(v2QueryUrl, {
      method: 'POST',
      headers,
      body: {
        site_id: siteId,
        metrics: ['visitors'],
        dimensions: ['visit:source', 'visit:entry_page'],
        date_range: period,
        pagination: { limit: 10 }
      }
    })
  ])

  const [
    breakdown,
    browsers,
    referrers,
    aggregate,
    time,
    realtime,
    channels,
    countries,
    referralLanding
  ] = results
  const failures: string[] = []

  const response: PlausibleDashboardResponse = {
    aggregateStats: { ...DEFAULT_AGGREGATE },
    breakdownStats: [],
    browserBreakdown: [],
    referrerBreakdown: [],
    timeStats: [],
    realtimeStats: 0,
    channelBreakdown: [],
    countryBreakdown: [],
    referralLandingBreakdown: [],
    failures
  }

  // Map breakdown stats
  if (breakdown.status === 'fulfilled') {
    response.breakdownStats = breakdown.value.results.map(row => ({
      page: row.dimensions[0] || null,
      visitors: row.metrics[0] ?? null
    }))
  } else {
    failures.push(`breakdown stats: ${breakdown.reason?.message || breakdown.reason}`)
    console.log('Plausible analytics: breakdown stats failed:', breakdown.reason)
  }

  // Map browser breakdown
  if (browsers.status === 'fulfilled') {
    response.browserBreakdown = browsers.value.results.map(row => ({
      browser: row.dimensions[0] || null,
      visitors: row.metrics[0] ?? null
    })) as any
  } else {
    failures.push(`browser stats: ${browsers.reason?.message || browsers.reason}`)
    console.log('Plausible analytics: browser stats failed:', browsers.reason)
  }

  // Map referrer breakdown
  if (referrers.status === 'fulfilled') {
    response.referrerBreakdown = referrers.value.results.map(row => ({
      referrer: row.dimensions[0] || null,
      visitors: row.metrics[0] ?? null
    })) as any
  } else {
    failures.push(`referrer stats: ${referrers.reason?.message || referrers.reason}`)
    console.log('Plausible analytics: referrer stats failed:', referrers.reason)
  }

  // Map time/timeseries stats
  if (time.status === 'fulfilled') {
    response.timeStats = time.value.results.map(row => ({
      date: row.dimensions[0] || null,
      visitors: row.metrics[0] ?? null
    }))
  } else {
    failures.push(`timeseries stats: ${time.reason?.message || time.reason}`)
    console.log('Plausible analytics: timeseries stats failed:', time.reason)
  }

  // Map realtime visitors
  if (realtime.status === 'fulfilled') {
    response.realtimeStats = realtime.value
  } else {
    failures.push(`realtime visitors: ${realtime.reason?.message || realtime.reason}`)
    console.log('Plausible analytics: realtime visitors failed:', realtime.reason)
  }

  // Map channels breakdown
  if (channels.status === 'fulfilled') {
    response.channelBreakdown = channels.value.results.map(row => ({
      channel: row.dimensions[0] || null,
      visitors: row.metrics[0] ?? null
    }))
  } else {
    failures.push(`channel stats: ${channels.reason?.message || channels.reason}`)
    console.log('Plausible analytics: channel stats failed:', channels.reason)
  }

  // Map country breakdown
  if (countries.status === 'fulfilled') {
    response.countryBreakdown = countries.value.results.map(row => ({
      country: row.dimensions[0] || null,
      visitors: row.metrics[0] ?? null
    }))
  } else {
    failures.push(`country stats: ${countries.reason?.message || countries.reason}`)
    console.log('Plausible analytics: country stats failed:', countries.reason)
  }

  // Map referral landing paths breakdown
  if (referralLanding.status === 'fulfilled') {
    response.referralLandingBreakdown = referralLanding.value.results.map(row => ({
      source: row.dimensions[0] || null,
      entryPage: row.dimensions[1] || null,
      visitors: row.metrics[0] ?? null
    }))
  } else {
    failures.push(`referral landing stats: ${referralLanding.reason?.message || referralLanding.reason}`)
    console.log('Plausible analytics: referral landing stats failed:', referralLanding.reason)
  }

  // Map aggregate stats and calculate percentage changes (previous period)
  if (aggregate.status === 'fulfilled') {
    const resolvedDateRange = aggregate.value.query?.date_range
    const requestedMetrics = aggregate.value.query?.metrics || []

    const currentResultsRow = aggregate.value.results?.[0]
    const currentMetrics = currentResultsRow ? currentResultsRow.metrics : []

    let prevMetrics: number[] | null = null

    if (period !== 'all' && resolvedDateRange && resolvedDateRange.length === 2) {
      try {
        const currentStart = new Date(resolvedDateRange[0])
        const currentEnd = new Date(resolvedDateRange[1])
        const durationMs = currentEnd.getTime() - currentStart.getTime() + 1000

        const prevEnd = new Date(currentStart.getTime() - 1000)
        const prevStart = new Date(currentStart.getTime() - durationMs)

        const prevAggregate = await $fetch<V2AggregateResponse>(v2QueryUrl, {
          method: 'POST',
          headers,
          body: {
            site_id: siteId,
            metrics: ['visitors', 'visits', 'pageviews', 'bounce_rate', 'visit_duration', 'events'],
            date_range: [prevStart.toISOString(), prevEnd.toISOString()]
          }
        })
        const prevResultsRow = prevAggregate.results?.[0]
        prevMetrics = prevResultsRow ? prevResultsRow.metrics : null
      } catch (err) {
        console.log('Plausible analytics: previous period aggregate failed:', err)
      }
    }

    /**
     * Retrieves the numeric value of a specific metric from the Plausible v2 response metrics array.
     *
     * @param {number[] | null} metricsArray - The raw metrics array from the Plausible v2 response row.
     * @param {string} metricName - The name of the metric to look up.
     * @returns {number | null} The metric value, or null if not found or unavailable.
     */
    const getMetricValue = (metricsArray: number[] | null, metricName: string): number | null => {
      if (!metricsArray)
        return null
      const idx = requestedMetrics.indexOf(metricName)
      if (idx === -1)
        return null
      return metricsArray[idx] ?? null
    }

    /**
     * Calculates the percentage change of a metric compared to the previous period.
     *
     * @param {string} metricName - The name of the metric to calculate change for.
     * @returns {number | null} The percentage change rounded to one decimal place, or null if unavailable.
     */
    const calculateChange = (metricName: string): number | null => {
      const currentVal = getMetricValue(currentMetrics, metricName)
      const prevVal = getMetricValue(prevMetrics, metricName)

      if (currentVal === undefined || currentVal === null)
        return null
      if (prevVal === undefined || prevVal === null || prevVal === 0)
        return null

      return Number.parseFloat(((currentVal - prevVal) / prevVal * 100).toFixed(1))
    }

    response.aggregateStats = {
      bounce_rate: {
        value: getMetricValue(currentMetrics, 'bounce_rate'),
        change: calculateChange('bounce_rate')
      },
      pageviews: {
        value: getMetricValue(currentMetrics, 'pageviews'),
        change: calculateChange('pageviews')
      },
      visit_duration: {
        value: getMetricValue(currentMetrics, 'visit_duration'),
        change: calculateChange('visit_duration')
      },
      visitors: {
        value: getMetricValue(currentMetrics, 'visitors'),
        change: calculateChange('visitors')
      },
      visits: {
        value: getMetricValue(currentMetrics, 'visits'),
        change: calculateChange('visits')
      }
    }
  } else {
    failures.push(`aggregate stats: ${aggregate.reason?.message || aggregate.reason}`)
    console.log('Plausible analytics: aggregate stats failed:', aggregate.reason)
  }

  return response
})
