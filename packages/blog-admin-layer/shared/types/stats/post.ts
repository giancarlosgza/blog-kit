/** Ranges offered by the post performance and top posts cards. */
export type PostAnalyticsRange = '7d' | '30d' | '90d'

/** Inclusive calendar span, `YYYY-MM-DD` on both ends. */
export interface PostAnalyticsSpan {
  from: string
  to: string
}

export type PostAnalyticsMetricKey = 'pageviews' | 'visitors' | 'visit_duration' | 'bounce_rate'

/** A metric for the range with the same metric over the previous equal range. */
export interface PostAnalyticsMetric {
  value: number | null
  previous: number | null
  /** Percent change vs the previous range, one decimal; null when the previous value is 0 or missing. */
  change: number | null
}

/** One day of the range; days without traffic are filled with 0. */
export interface PostAnalyticsPoint {
  date: string
  pageviews: number
  visitors: number
  visit_duration: number
  bounce_rate: number
}

export interface PostAnalyticsSource {
  source: string
  visitors: number
}

/** `GET /api/analytics/post?slug=&range=` */
export interface PostAnalyticsResponse {
  slug: string
  range: PostAnalyticsRange
  period: PostAnalyticsSpan
  previousPeriod: PostAnalyticsSpan
  metrics: Record<PostAnalyticsMetricKey, PostAnalyticsMetric>
  timeseries: PostAnalyticsPoint[]
  sources: PostAnalyticsSource[]
}

export interface TopPost {
  slug: string
  title: string
  imageURL: string | null
  color: string | null
  /** Unix ms, the date the blog shows as published. */
  createdAt: number | null
  views: number
  previousViews: number
  change: number | null
  /** Daily pageviews over the range, oldest first. */
  series: number[]
}

/** `GET /api/analytics/top-posts?range=` */
export interface TopPostsResponse {
  range: PostAnalyticsRange
  period: PostAnalyticsSpan
  previousPeriod: PostAnalyticsSpan
  posts: TopPost[]
}
