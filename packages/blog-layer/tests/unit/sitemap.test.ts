import type { IPost } from '@giancarlosgza/blog-core'
import { Timestamp } from 'firebase-admin/firestore'
import { describe, expect, it } from 'vitest'
import { toAuthor, toPost, toSeries, toTag } from '../../server/utils/blog-data'
import { buildSitemapUrls } from '../../server/utils/sitemap'

const MS = Date.UTC(2026, 9, 1)
const ISO = new Date(MS).toISOString()

function post(id: string, fields: Partial<IPost> = {}): IPost {
  return { id, title: `Title ${id}`, isPublished: true, createdAt: 1_000, ...fields }
}

function sources(overrides: Partial<Parameters<typeof buildSitemapUrls>[0]> = {}) {
  return { posts: [], tags: [], authors: [], series: [], ...overrides }
}

describe('buildSitemapUrls', () => {
  it('prefixes every URL with the base path', () => {
    const urls = buildSitemapUrls(sources({
      basePath: '/blog',
      posts: [post('a', { seriesSlug: 's' })],
      tags: [toTag('CSS', { name: 'CSS' })],
      authors: [toAuthor('uid', { name: 'Gian', slug: 'gian' })],
      series: [toSeries('s', { name: 'S' })]
    }))
    expect(urls.map(url => url.loc)).toEqual(['/blog/a', '/blog/tags/CSS', '/blog/authors/gian', '/blog/series/s'])
  })

  it('lists posts at their root slug with updatedAt, then createdAt, as lastmod', () => {
    expect(buildSitemapUrls(sources({ posts: [post('a', { updatedAt: MS }), post('b', { createdAt: MS })] }))).toEqual([
      { loc: '/a', lastmod: ISO, changefreq: 'weekly', priority: 0.7 },
      { loc: '/b', lastmod: ISO, changefreq: 'weekly', priority: 0.7 }
    ])
  })

  it('reads Timestamps through the Firestore mappers', () => {
    const mapped = toPost('a', { isPublished: true, updatedAt: Timestamp.fromMillis(MS) })
    expect(buildSitemapUrls(sources({ posts: [mapped] }))[0]?.lastmod).toBe(ISO)
  })

  it('skips noindex and unpublished posts', () => {
    const urls = buildSitemapUrls(sources({ posts: [post('a', { noindex: true }), post('b', { isPublished: false }), post('c')] }))
    expect(urls.map(url => url.loc)).toEqual(['/c'])
  })

  it('lists named tags and authors with a slug', () => {
    const urls = buildSitemapUrls(sources({
      tags: [toTag('CSS', { name: 'CSS' }), toTag('x', {})],
      authors: [toAuthor('uid', { name: 'Gian', slug: 'gian', updatedAt: MS }), toAuthor('uid2', { name: 'No slug' })]
    }))
    expect(urls).toEqual([
      { loc: '/tags/CSS', changefreq: 'weekly', priority: 0.4 },
      { loc: '/authors/gian', lastmod: ISO, changefreq: 'weekly', priority: 0.4 }
    ])
  })

  it('lists a series only once it has an indexable published part', () => {
    const urls = buildSitemapUrls(sources({
      posts: [post('a', { seriesSlug: 'listed' }), post('b', { seriesSlug: 'hidden', noindex: true })],
      series: [toSeries('listed', { name: 'Listed', updatedAt: MS }), toSeries('hidden', { name: 'Hidden' }), toSeries('empty', { name: 'Empty' })]
    }))
    expect(urls.filter(url => url.loc.startsWith('/series/'))).toEqual([
      { loc: '/series/listed', lastmod: ISO, changefreq: 'weekly', priority: 0.5 }
    ])
  })
})
