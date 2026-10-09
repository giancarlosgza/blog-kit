import type { IPost } from '@giancarlosgza/blog-core'
import type { V2QueryResponse } from '#admin/shared/types/stats/plausible-v2'
import type { TopPost, TopPostsResponse } from '#admin/shared/types/stats/post'
import { getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { deltaPercent, fillDaily, pageToPostSlug, periodSpans, postPagePaths, rankSlugs, resolvePostAnalyticsRange, selectTopPosts, spanDays, viewsBySlug } from '#admin/shared/utils/post-analytics'

const TOP_LIMIT = 5
// Home, listings and pages of drafts share the breakdown, so over-fetch before matching posts.
const CANDIDATE_LIMIT = 30

function toMillisValue(value: unknown): number | null {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : null
  if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function')
    return (value as { toMillis: () => number }).toMillis()
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function pageRows(response: V2QueryResponse) {
  return (response.results ?? []).map(row => ({ page: row.dimensions[0], views: row.metrics[0] }))
}

export default defineEventHandler(async (event): Promise<TopPostsResponse> => {
  await requireStaff(event)

  const range = resolvePostAnalyticsRange(getQuery(event).range)
  const plausible = createPlausibleQuery(event)
  const { current, previous } = periodSpans(range)
  const empty: TopPostsResponse = { range, period: current, previousPeriod: previous, posts: [] }

  let breakdown: V2QueryResponse
  try {
    breakdown = await plausible({
      metrics: ['pageviews'],
      dimensions: ['event:page'],
      date_range: [current.from, current.to],
      order_by: [['pageviews', 'desc']],
      pagination: { limit: CANDIDATE_LIMIT }
    })
  } catch (err) {
    throw plausibleUnavailable(err, 'top pages')
  }

  const views = viewsBySlug(pageRows(breakdown))
  const ranked = rankSlugs(views)
  if (!ranked.length)
    return empty

  const db = getFirestore(getApp())
  const snaps = await db.getAll(...ranked.map(slug => db.collection('posts').doc(slug)))
  const posts = new Map<string, IPost>()
  for (const snap of snaps) {
    const data = snap.data() as IPost | undefined
    if (data?.isPublished)
      posts.set(snap.id, data)
  }

  const top = selectTopPosts(ranked, views, slug => posts.get(slug), TOP_LIMIT)
  if (!top.length)
    return empty

  const filters = [['is', 'event:page', top.flatMap(item => postPagePaths(item.slug))]]
  const [previousResult, timeseriesResult] = await Promise.allSettled([
    plausible({ metrics: ['pageviews'], dimensions: ['event:page'], date_range: [previous.from, previous.to], filters }),
    plausible({ metrics: ['pageviews'], dimensions: ['time:day', 'event:page'], date_range: [current.from, current.to], filters })
  ])
  if (previousResult.status === 'rejected')
    throw plausibleUnavailable(previousResult.reason, 'top posts comparison')
  // Sparklines are decoration: without the daily breakdown the rows still rank and compare.
  if (timeseriesResult.status === 'rejected')
    logPlausibleFailure(timeseriesResult.reason, 'top posts daily series')
  const previousBreakdown = previousResult.value
  const timeseries = timeseriesResult.status === 'fulfilled' ? timeseriesResult.value : null

  const previousViews = viewsBySlug(pageRows(previousBreakdown))
  const days = spanDays(current)
  const dailyRows = (timeseries?.results ?? []).map(row => ({ slug: pageToPostSlug(row.dimensions[1]), date: row.dimensions[0], value: row.metrics[0] }))

  return {
    ...empty,
    posts: top.map(({ slug, views: count, post }): TopPost => {
      const before = previousViews.get(slug) ?? 0
      return {
        slug,
        title: post.title || slug,
        imageURL: post.imageURL || null,
        color: post.color || null,
        createdAt: toMillisValue(post.createdAt),
        views: count,
        previousViews: before,
        change: deltaPercent(count, before),
        series: timeseries ? fillDaily(days, dailyRows.filter(row => row.slug === slug)) : []
      }
    })
  }
})
