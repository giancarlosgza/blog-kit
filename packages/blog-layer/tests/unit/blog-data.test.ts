import { Firestore, Timestamp } from 'firebase-admin/firestore'
import { describe, expect, it } from 'vitest'
import { appendPosts } from '#blog/app/composables/usePaginatedPosts'
import {
  encodeKeyPart,
  isPublishedPost,
  pagedCacheKey,
  parseLimit,
  parsePage,
  parseText,
  postListCacheKey,
  POSTS_MAX_PAGE,
  serializeFirestore,
  slicePage,
  toAuthor,
  toPost,
  toPublishedPost,
  toPublishedPosts,
  toSettings,
  toTag
} from '../../server/utils/blog-data'

describe('serializeFirestore', () => {
  it('turns Firestore Timestamps into Unix ms, deeply', () => {
    const createdAt = new Timestamp(1_700_000_000, 500_000_000)
    const value = serializeFirestore({
      createdAt,
      nested: { updatedAt: createdAt },
      list: [createdAt, 'text']
    })

    expect(value).toEqual({
      createdAt: 1_700_000_000_500,
      nested: { updatedAt: 1_700_000_000_500 },
      list: [1_700_000_000_500, 'text']
    })
  })

  it('turns Dates into ms and keeps primitives as they are', () => {
    expect(serializeFirestore(new Date(1_000))).toBe(1_000)
    expect(serializeFirestore({ a: 1, b: 'x', c: null, d: true })).toEqual({ a: 1, b: 'x', c: null, d: true })
  })

  it('reduces non-plain objects to plain values (no circular client references)', () => {
    const reference = { path: 'authors/uid-1', firestore: {} as unknown }
    Object.assign(reference, { firestore: { self: reference } })
    class Unknown {
      toString() {
        return 'unknown'
      }
    }

    expect(serializeFirestore({ author: reference, other: new Unknown() })).toEqual({ author: 'authors/uid-1', other: 'unknown' })
  })

  it('serializes Admin SDK document references to their path', () => {
    const reference = new Firestore({ projectId: 'demo-blog' }).collection('authors').doc('uid-1')
    expect(serializeFirestore({ author: reference })).toEqual({ author: 'authors/uid-1' })
  })

  it('produces plain JSON', () => {
    const value = serializeFirestore({ at: new Timestamp(1, 0), tags: ['CSS'] })
    expect(JSON.parse(JSON.stringify(value))).toEqual(value)
  })
})

describe('document mappers', () => {
  it('uses the document id over a stored id field', () => {
    expect(toPost('real-slug', { id: 'stale', title: 'T', isPublished: true })).toEqual({ id: 'real-slug', title: 'T', isPublished: true })
    expect(toAuthor('uid-1', { name: 'A', id: 'x' }).id).toBe('uid-1')
    expect(toTag('CSS', { name: 'CSS', count: 3 })).toEqual({ id: 'CSS', name: 'CSS', count: 3 })
  })

  it('serializes timestamps in documents', () => {
    const post = toPost('p', { title: 'T', isPublished: true, createdAt: new Timestamp(10, 0), updatedAt: 1_700_000_000_000 })
    expect(post.createdAt).toBe(10_000)
    expect(post.updatedAt).toBe(1_700_000_000_000)
    expect(toSettings({ blogName: 'Colorffy', updatedAt: new Timestamp(2, 0) })).toEqual({ blogName: 'Colorffy', updatedAt: 2_000 })
  })
})

describe('public post visibility', () => {
  it('only treats isPublished === true as public', () => {
    expect(isPublishedPost({ isPublished: true })).toBe(true)
    expect(isPublishedPost({ isPublished: false })).toBe(false)
    expect(isPublishedPost({ isPublished: 'true' })).toBe(false)
    expect(isPublishedPost({ isPublished: 1 })).toBe(false)
    expect(isPublishedPost({})).toBe(false)
    expect(isPublishedPost(null)).toBe(false)
    expect(isPublishedPost(undefined)).toBe(false)
  })

  it('maps a single post only when it is published', () => {
    expect(toPublishedPost('live', { title: 'Live', isPublished: true })).toEqual({ id: 'live', title: 'Live', isPublished: true })
    expect(toPublishedPost('draft', { title: 'Draft', isPublished: false })).toBeNull()
    expect(toPublishedPost('missing', undefined)).toBeNull()
  })

  it('drops unpublished documents from a list even if the query let them through', () => {
    const posts = toPublishedPosts([
      { id: 'a', data: { title: 'A', isPublished: true } },
      { id: 'b', data: { title: 'B', isPublished: false } },
      { id: 'c', data: { title: 'C' } },
      { id: 'd', data: { title: 'D', isPublished: true } }
    ])
    expect(posts.map(post => post.id)).toEqual(['a', 'd'])
  })
})

describe('query params', () => {
  it('parses the page, defaulting to 1', () => {
    expect(parsePage(undefined)).toBe(1)
    expect(parsePage('')).toBe(1)
    expect(parsePage('3')).toBe(3)
    expect(parsePage(['2', '5'])).toBe(2)
  })

  it('rejects malformed and out-of-range pages', () => {
    expect(parsePage('0')).toBeNull()
    expect(parsePage('-1')).toBeNull()
    expect(parsePage('1.5')).toBeNull()
    expect(parsePage('abc')).toBeNull()
    expect(parsePage(String(POSTS_MAX_PAGE + 1))).toBeNull()
    expect(parsePage(String(POSTS_MAX_PAGE))).toBe(POSTS_MAX_PAGE)
  })

  it('clamps the limit to 1-50, defaulting to 12', () => {
    expect(parseLimit(undefined)).toBe(12)
    expect(parseLimit('0')).toBe(12)
    expect(parseLimit('x')).toBe(12)
    expect(parseLimit('6')).toBe(6)
    expect(parseLimit('500')).toBe(50)
  })

  it('reads trimmed text params', () => {
    expect(parseText(' CSS ')).toBe('CSS')
    expect(parseText('   ')).toBeNull()
    expect(parseText(undefined)).toBeNull()
    expect(parseText(['Design', 'CSS'])).toBe('Design')
  })
})

describe('slicePage', () => {
  const items = Array.from({ length: 17 }, (_, index) => index + 1)

  it('returns the requested page out of the first page × size', () => {
    expect(slicePage(items.slice(0, 12), 1, 12)).toEqual({ items: items.slice(0, 12), hasMore: true })
    expect(slicePage(items, 2, 12)).toEqual({ items: items.slice(12), hasMore: false })
  })

  it('returns an empty page past the end', () => {
    expect(slicePage(items, 3, 12)).toEqual({ items: [], hasMore: false })
  })

  it('keeps the legacy hasMore rule on an exactly full page', () => {
    expect(slicePage(items.slice(0, 12), 1, 12).hasMore).toBe(true)
    expect(slicePage(items.slice(0, 11), 1, 12).hasMore).toBe(false)
  })
})

describe('cache keys', () => {
  it('stays unique after Nitro strips non-word characters', () => {
    const strip = (key: string) => key.replace(/\W/g, '')
    expect(strip(encodeKeyPart('UI/UX'))).not.toBe(strip(encodeKeyPart('UIUX')))
    expect(strip(pagedCacheKey('a-b', 1))).not.toBe(strip(pagedCacheKey('a_b', 1)))
    expect(strip(pagedCacheKey('café', 1))).not.toBe(strip(pagedCacheKey('caf', 1)))
  })

  it('is word characters only, so Nitro keeps it intact', () => {
    const key = postListCacheKey({ page: 2, size: 12, tag: 'Color Theory' })
    expect(key).toMatch(/^\w+$/)
    expect(key).toBe(`page_2_size_12_tag_${encodeKeyPart('Color Theory')}`)
  })

  it('separates filtered, unfiltered and invalid requests', () => {
    const keys = new Set([
      postListCacheKey({ page: 1, size: 12, tag: null }),
      postListCacheKey({ page: 1, size: 12, tag: 'CSS' }),
      postListCacheKey({ page: 2, size: 12, tag: null }),
      postListCacheKey({ page: 1, size: 6, tag: null }),
      postListCacheKey({ page: null, size: 12, tag: null })
    ])
    expect(keys.size).toBe(5)
  })
})

describe('appendPosts', () => {
  it('appends the next page without duplicating shifted posts', () => {
    const current = [{ id: 'a', title: 'A', isPublished: true }, { id: 'b', title: 'B', isPublished: true }]
    const next = [{ id: 'b', title: 'B', isPublished: true }, { id: 'c', title: 'C', isPublished: true }]
    expect(appendPosts(current, next).map(post => post.id)).toEqual(['a', 'b', 'c'])
  })
})
