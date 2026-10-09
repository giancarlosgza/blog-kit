import type { V2QueryResponse } from '#admin/shared/types/stats/plausible-v2'
import type { PostAnalyticsMetric, PostAnalyticsMetricKey, PostAnalyticsResponse } from '#admin/shared/types/stats/post'
import { deltaPercent, fillDaily, periodSpans, postPagePaths, resolvePostAnalyticsRange, spanDays } from '#admin/shared/utils/post-analytics'

const METRICS: PostAnalyticsMetricKey[] = ['pageviews', 'visitors', 'visit_duration', 'bounce_rate']

function metricsRow(response: V2QueryResponse): (number | null)[] {
  const row = response.results?.[0]?.metrics ?? []
  return METRICS.map((_, index) => (Number.isFinite(row[index]) ? row[index]! : null))
}

export default defineEventHandler(async (event): Promise<PostAnalyticsResponse> => {
  await requireStaff(event)

  const query = getQuery(event)
  const slug = typeof query.slug === 'string' ? query.slug.trim() : ''
  if (!slug || slug.includes('/') || slug.length > 200)
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid slug' })
  const range = resolvePostAnalyticsRange(query.range)

  const plausible = createPlausibleQuery(event)
  const { current, previous } = periodSpans(range)
  const filters = [['is', 'event:page', postPagePaths(slug)]]

  let responses: V2QueryResponse[]
  try {
    responses = await Promise.all([
      plausible({ metrics: METRICS, date_range: [current.from, current.to], filters }),
      plausible({ metrics: METRICS, date_range: [previous.from, previous.to], filters }),
      plausible({ metrics: METRICS, dimensions: ['time:day'], date_range: [current.from, current.to], filters }),
      plausible({
        metrics: ['visitors'],
        dimensions: ['visit:source'],
        date_range: [current.from, current.to],
        filters,
        order_by: [['visitors', 'desc']],
        pagination: { limit: 5 }
      })
    ])
  } catch (err) {
    throw plausibleUnavailable(err, 'post stats')
  }
  const [aggregate, previousAggregate, timeseries, sources] = responses as [V2QueryResponse, V2QueryResponse, V2QueryResponse, V2QueryResponse]

  const currentValues = metricsRow(aggregate)
  const previousValues = metricsRow(previousAggregate)
  const metrics = Object.fromEntries(METRICS.map((key, index): [PostAnalyticsMetricKey, PostAnalyticsMetric] => [key, {
    value: currentValues[index] ?? null,
    previous: previousValues[index] ?? null,
    change: deltaPercent(currentValues[index], previousValues[index])
  }])) as Record<PostAnalyticsMetricKey, PostAnalyticsMetric>

  const days = spanDays(current)
  const rows = timeseries.results ?? []
  const series = METRICS.map((_, index) => fillDaily(days, rows.map(row => ({ date: row.dimensions[0], value: row.metrics[index] }))))

  return {
    slug,
    range,
    period: current,
    previousPeriod: previous,
    metrics,
    timeseries: days.map((date, index) => ({
      date,
      pageviews: series[0]![index]!,
      visitors: series[1]![index]!,
      visit_duration: series[2]![index]!,
      bounce_rate: series[3]![index]!
    })),
    sources: (sources.results ?? []).map(row => ({ source: row.dimensions[0] || 'Direct / None', visitors: Number(row.metrics[0] ?? 0) }))
  }
})
