import type { PostAnalyticsRange, PostAnalyticsSpan } from '../types/stats/post'

export const POST_ANALYTICS_RANGES: PostAnalyticsRange[] = ['7d', '30d', '90d']
export const DEFAULT_POST_ANALYTICS_RANGE: PostAnalyticsRange = '30d'

const RANGE_DAYS: Record<PostAnalyticsRange, number> = { '7d': 7, '30d': 30, '90d': 90 }
const DAY_MS = 86_400_000

// First path segments the blog routes to listing pages, never to a post; dotted paths are files.
const NON_POST_SEGMENTS = new Set(['tags', 'authors', 'series', 'page', 'posts'])

export function isPostAnalyticsRange(value: unknown): value is PostAnalyticsRange {
  return typeof value === 'string' && (POST_ANALYTICS_RANGES as string[]).includes(value)
}

export function resolvePostAnalyticsRange(value: unknown): PostAnalyticsRange {
  return isPostAnalyticsRange(value) ? value : DEFAULT_POST_ANALYTICS_RANGE
}

export function rangeDays(range: PostAnalyticsRange): number {
  return RANGE_DAYS[range]
}

function toDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * The range ending today (inclusive) and the equal range right before it, as UTC calendar days.
 * Explicit dates keep both periods the same length; Plausible has no `90d` preset.
 */
export function periodSpans(range: PostAnalyticsRange, now: Date = new Date()): { current: PostAnalyticsSpan, previous: PostAnalyticsSpan } {
  const days = rangeDays(range)
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return {
    current: { from: toDay(today - (days - 1) * DAY_MS), to: toDay(today) },
    previous: { from: toDay(today - (2 * days - 1) * DAY_MS), to: toDay(today - days * DAY_MS) }
  }
}

/** Every `YYYY-MM-DD` in the span, oldest first. */
export function spanDays(span: PostAnalyticsSpan): string[] {
  const start = Date.parse(`${span.from}T00:00:00Z`)
  const end = Date.parse(`${span.to}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return []
  const out: string[] = []
  for (let ms = start; ms <= end; ms += DAY_MS)
    out.push(toDay(ms))
  return out
}

/** Percent change, one decimal; null when there is nothing to compare against. */
export function deltaPercent(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current === null || current === undefined || !Number.isFinite(current))
    return null
  if (previous === null || previous === undefined || !Number.isFinite(previous) || previous === 0)
    return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export type DeltaTone = 'success' | 'danger' | 'default'

/** Up is good, except for metrics like bounce rate where `reversed` makes a rise bad. */
export function deltaTone(change: number | null | undefined, reversed = false): DeltaTone {
  if (change === null || change === undefined || change === 0 || !Number.isFinite(change))
    return 'default'
  return (change > 0) !== reversed ? 'success' : 'danger'
}

/** `+12%`, `−6%`, `+0.4%`; one decimal under 10%. */
export function formatDelta(change: number | null | undefined): string {
  if (change === null || change === undefined || !Number.isFinite(change))
    return ''
  const abs = Math.abs(change)
  const digits = abs < 10 ? 1 : 0
  const text = new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(abs)
  if (text === '0')
    return '0%'
  return `${change > 0 ? '+' : '−'}${text}%`
}

/** Page paths Plausible may hold for a post: the current `/{slug}` and the legacy `/posts/{slug}` (301s now). */
export function postPagePaths(slug: string): string[] {
  return [`/${slug}`, `/posts/${slug}`]
}

/** The post slug a tracked page path points to, or null for home, listings and other pages. */
export function pageToPostSlug(page: string | null | undefined): string | null {
  if (!page)
    return null
  const path = page.split(/[?#]/)[0]!.replace(/\/+$/, '')
  const segments = path.split('/').filter(Boolean)
  const slug = segments.length === 1
    ? segments[0]
    : segments.length === 2 && segments[0] === 'posts' ? segments[1] : null
  if (!slug || (segments.length === 1 && NON_POST_SEGMENTS.has(slug)) || slug.includes('.'))
    return null
  try {
    return decodeURIComponent(slug)
  } catch {
    return null
  }
}

export interface PageViewsRow {
  page: string | null | undefined
  views: number | null | undefined
}

/** Sums views per post slug, merging legacy paths; non-post pages are dropped. */
export function viewsBySlug(rows: PageViewsRow[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const row of rows) {
    const slug = pageToPostSlug(row.page)
    const views = Number(row.views ?? 0)
    if (!slug || !Number.isFinite(views))
      continue
    out.set(slug, (out.get(slug) ?? 0) + views)
  }
  return out
}

/** Slugs sorted by views, highest first; ties keep the first-seen order. */
export function rankSlugs(views: Map<string, number>): string[] {
  return [...views.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug)
}

export interface TopPostCandidate<T> {
  slug: string
  views: number
  post: T
}

/** The first `limit` ranked slugs that resolve to a published post. */
export function selectTopPosts<T>(ranked: string[], views: Map<string, number>, lookup: (slug: string) => T | null | undefined, limit = 5): TopPostCandidate<T>[] {
  const out: TopPostCandidate<T>[] = []
  for (const slug of ranked) {
    if (out.length >= limit)
      break
    const post = lookup(slug)
    if (post)
      out.push({ slug, views: views.get(slug) ?? 0, post })
  }
  return out
}

export interface DailyRow {
  date: string | null | undefined
  value: number | null | undefined
}

/** One value per day of `days`; missing days are 0 and duplicate days (legacy paths) are summed. */
export function fillDaily(days: string[], rows: DailyRow[]): number[] {
  const byDay = new Map<string, number>()
  for (const row of rows) {
    const day = row.date?.slice(0, 10)
    const value = Number(row.value ?? 0)
    if (!day || !Number.isFinite(value))
      continue
    byDay.set(day, (byDay.get(day) ?? 0) + value)
  }
  return days.map(day => byDay.get(day) ?? 0)
}

/** Plausible dashboard link filtered to one page over the exact span the card shows. */
export function plausiblePageUrl(apiBaseUrl: string | null | undefined, siteId: string, page: string, span: PostAnalyticsSpan): string | null {
  if (!apiBaseUrl)
    return null
  let origin: string
  try {
    origin = new URL(apiBaseUrl).origin
  } catch {
    return null
  }
  const query = new URLSearchParams({ page, period: 'custom', from: span.from, to: span.to })
  return `${origin}/${encodeURIComponent(siteId)}?${query}`
}
