import { describe, expect, it } from 'vitest'
import {
  deltaPercent,
  deltaTone,
  fillDaily,
  formatDelta,
  pageToPostSlug,
  periodSpans,
  plausiblePageUrl,
  postPagePaths,
  rankSlugs,
  resolvePostAnalyticsRange,
  selectTopPosts,
  spanDays,
  viewsBySlug
} from '#admin/shared/utils/post-analytics'

describe('resolvePostAnalyticsRange', () => {
  it('keeps supported ranges and falls back to 30d', () => {
    expect(resolvePostAnalyticsRange('7d')).toBe('7d')
    expect(resolvePostAnalyticsRange('90d')).toBe('90d')
    expect(resolvePostAnalyticsRange('12mo')).toBe('30d')
    expect(resolvePostAnalyticsRange(undefined)).toBe('30d')
  })
})

describe('periodSpans', () => {
  const now = new Date('2026-09-23T15:30:00Z')

  it('ends the current range today and puts an equal range right before it', () => {
    expect(periodSpans('7d', now)).toEqual({
      current: { from: '2026-09-17', to: '2026-09-23' },
      previous: { from: '2026-09-10', to: '2026-09-16' }
    })
  })

  it('covers 90 days for 90d, across month boundaries', () => {
    const { current, previous } = periodSpans('90d', now)
    expect(spanDays(current)).toHaveLength(90)
    expect(spanDays(previous)).toHaveLength(90)
    expect(current.from).toBe('2026-06-26')
    expect(previous.to).toBe('2026-06-25')
  })
})

describe('spanDays', () => {
  it('lists every day inclusive and rejects inverted spans', () => {
    expect(spanDays({ from: '2026-02-27', to: '2026-03-02' })).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02'])
    expect(spanDays({ from: '2026-03-02', to: '2026-03-01' })).toEqual([])
  })
})

describe('deltaPercent', () => {
  it('rounds to one decimal', () => {
    expect(deltaPercent(1284, 1146)).toBe(12)
    expect(deltaPercent(85, 96)).toBe(-11.5)
    expect(deltaPercent(100, 100)).toBe(0)
  })

  it('is null without a previous value to compare against', () => {
    expect(deltaPercent(10, 0)).toBeNull()
    expect(deltaPercent(10, null)).toBeNull()
    expect(deltaPercent(null, 10)).toBeNull()
  })
})

describe('deltaTone', () => {
  it('treats a rise as good', () => {
    expect(deltaTone(12)).toBe('success')
    expect(deltaTone(-6)).toBe('danger')
    expect(deltaTone(0)).toBe('default')
    expect(deltaTone(null)).toBe('default')
  })

  it('reverses for bounce rate', () => {
    expect(deltaTone(3, true)).toBe('danger')
    expect(deltaTone(-3, true)).toBe('success')
  })
})

describe('formatDelta', () => {
  it('signs the change and keeps one decimal under 10%', () => {
    expect(formatDelta(12.4)).toBe('+12%')
    expect(formatDelta(-6.3)).toBe('−6.3%')
    expect(formatDelta(0.04)).toBe('0%')
    expect(formatDelta(null)).toBe('')
  })
})

describe('pageToPostSlug', () => {
  it('reads post slugs from current and legacy paths', () => {
    expect(pageToPostSlug('/css-glassmorphism')).toBe('css-glassmorphism')
    expect(pageToPostSlug('/css-glassmorphism/')).toBe('css-glassmorphism')
    expect(pageToPostSlug('/posts/css-glassmorphism')).toBe('css-glassmorphism')
    expect(pageToPostSlug('/caf%C3%A9-colors?ref=x')).toBe('café-colors')
  })

  it('skips home, listings and files', () => {
    for (const page of ['/', '', null, '/tags/css', '/authors/ana', '/series/color', '/page/2', '/tags', '/posts', '/rss.xml', '/a/b/c'])
      expect(pageToPostSlug(page)).toBeNull()
  })

  it('matches the paths queried for a post', () => {
    expect(postPagePaths('dark-mode').map(pageToPostSlug)).toEqual(['dark-mode', 'dark-mode'])
  })
})

describe('top post selection', () => {
  const rows = [
    { page: '/', views: 900 },
    { page: '/dark-mode', views: 300 },
    { page: '/tags/css', views: 250 },
    { page: '/draft-post', views: 200 },
    { page: '/glass', views: 180 },
    { page: '/posts/glass', views: 150 },
    { page: '/variables', views: 90 }
  ]

  it('merges legacy paths and drops non-post pages', () => {
    const views = viewsBySlug(rows)
    expect(Object.fromEntries(views)).toEqual({ 'dark-mode': 300, 'draft-post': 200, 'glass': 330, 'variables': 90 })
    expect(rankSlugs(views)).toEqual(['glass', 'dark-mode', 'draft-post', 'variables'])
  })

  it('keeps only published posts up to the limit', () => {
    const views = viewsBySlug(rows)
    const published = new Map([['glass', 'Glass'], ['dark-mode', 'Dark mode'], ['variables', 'Variables']])
    const top = selectTopPosts(rankSlugs(views), views, slug => published.get(slug), 2)
    expect(top).toEqual([
      { slug: 'glass', views: 330, post: 'Glass' },
      { slug: 'dark-mode', views: 300, post: 'Dark mode' }
    ])
  })
})

describe('fillDaily', () => {
  it('fills missing days with 0 and sums duplicate days', () => {
    const days = ['2026-09-21', '2026-09-22', '2026-09-23']
    expect(fillDaily(days, [
      { date: '2026-09-21', value: 4 },
      { date: '2026-09-23', value: 2 },
      { date: '2026-09-23', value: 1 },
      { date: '2026-08-01', value: 9 }
    ])).toEqual([4, 0, 3])
  })
})

describe('plausiblePageUrl', () => {
  it('links the dashboard origin filtered to the page and span', () => {
    expect(plausiblePageUrl('https://plausible.example.com/api/v2/query', 'blog.colorffy.com', '/dark-mode', { from: '2026-08-25', to: '2026-09-23' }))
      .toBe('https://plausible.example.com/blog.colorffy.com?page=%2Fdark-mode&period=custom&from=2026-08-25&to=2026-09-23')
  })

  it('is null without a usable base URL', () => {
    expect(plausiblePageUrl('', 'x', '/a', { from: 'a', to: 'b' })).toBeNull()
    expect(plausiblePageUrl('not a url', 'x', '/a', { from: 'a', to: 'b' })).toBeNull()
  })
})
