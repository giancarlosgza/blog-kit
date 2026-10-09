import type { IPost } from '@giancarlosgza/blog-core'
import { Timestamp } from 'firebase-admin/firestore'
import { describe, expect, it } from 'vitest'
import { excludePosts, homeHeroPosts } from '#blog/app/composables/usePostFeed'
import {
  FEATURED_LIMIT,
  selectFeaturedPosts,
  sortSeriesPosts,
  toPostSeries,
  toSeries,
  toSeriesParts
} from '../../server/utils/blog-data'

function post(id: string, fields: Partial<IPost> = {}): IPost {
  return { id, title: `Title ${id}`, isPublished: true, createdAt: 1_000, ...fields }
}

function ids(posts: Array<{ id?: string, slug?: string }>): string[] {
  return posts.map(item => item.id ?? item.slug ?? '')
}

describe('toSeries', () => {
  it('maps a series doc with its id as the slug fallback and serialized timestamps', () => {
    const createdAt = new Timestamp(1_700_000_000, 0)
    expect(toSeries('color-basics', { name: 'Color basics', createdAt })).toEqual({
      id: 'color-basics',
      slug: 'color-basics',
      name: 'Color basics',
      createdAt: 1_700_000_000_000
    })
  })

  it('keeps a stored slug', () => {
    expect(toSeries('doc-id', { name: 'N', slug: 'stored' }).slug).toBe('stored')
  })
})

describe('sortSeriesPosts', () => {
  it('orders by part number, then oldest first', () => {
    const posts = [
      post('c', { seriesOrder: 3 }),
      post('b2', { seriesOrder: 2, createdAt: 3_000 }),
      post('a', { seriesOrder: 1 }),
      post('b1', { seriesOrder: 2, createdAt: 2_000 })
    ]
    expect(ids(sortSeriesPosts(posts))).toEqual(['a', 'b1', 'b2', 'c'])
  })

  it('lists unnumbered or invalid parts last', () => {
    const posts = [post('none'), post('zero', { seriesOrder: 0 }), post('two', { seriesOrder: 2 })]
    expect(ids(sortSeriesPosts(posts))).toEqual(['two', 'none', 'zero'])
  })

  it('does not mutate its input', () => {
    const posts = [post('b', { seriesOrder: 2 }), post('a', { seriesOrder: 1 })]
    sortSeriesPosts(posts)
    expect(ids(posts)).toEqual(['b', 'a'])
  })
})

describe('toSeriesParts', () => {
  it('maps published parts in order and marks the current one', () => {
    const parts = toSeriesParts([
      post('second', { seriesOrder: 2 }),
      post('first', { seriesOrder: 1 }),
      post('third', { seriesOrder: 3 })
    ], 'second')

    expect(parts).toEqual([
      { slug: 'first', title: 'Title first', seriesOrder: 1, isCurrent: false },
      { slug: 'second', title: 'Title second', seriesOrder: 2, isCurrent: true },
      { slug: 'third', title: 'Title third', seriesOrder: 3, isCurrent: false }
    ])
  })

  it('drops unpublished parts and nulls invalid part numbers', () => {
    const parts = toSeriesParts([
      post('draft', { seriesOrder: 1, isPublished: false }),
      post('loose', { seriesOrder: 1.5 })
    ], 'loose')

    expect(parts).toEqual([{ slug: 'loose', title: 'Title loose', seriesOrder: null, isCurrent: true }])
  })
})

describe('toPostSeries', () => {
  it('bundles the series with its parts', () => {
    const series = toPostSeries(
      { id: 'css', slug: 'css', name: 'CSS', description: 'Layout' },
      [post('two', { seriesOrder: 2 }), post('one', { seriesOrder: 1 })],
      'one'
    )

    expect(series.slug).toBe('css')
    expect(series.name).toBe('CSS')
    expect(series.description).toBe('Layout')
    expect(series.parts.map(part => [part.slug, part.isCurrent])).toEqual([['one', true], ['two', false]])
  })

  it('omits a blank description and falls back to the slug for the name', () => {
    const series = toPostSeries({ slug: 'css', name: '', description: '' }, [], 'x')
    expect(series).toEqual({ slug: 'css', name: 'css', parts: [] })
  })
})

describe('selectFeaturedPosts', () => {
  it('keeps published featured posts only', () => {
    const posts = [
      post('featured', { featured: true }),
      post('plain'),
      post('draft', { featured: true, isPublished: false }),
      post('false', { featured: false })
    ]
    expect(ids(selectFeaturedPosts(posts))).toEqual(['featured'])
  })

  it('orders by featuredOrder, unset last, then newest first', () => {
    const posts = [
      post('unset-old', { featured: true, createdAt: 1_000 }),
      post('second', { featured: true, featuredOrder: 2 }),
      post('unset-new', { featured: true, createdAt: 5_000 }),
      post('first', { featured: true, featuredOrder: 1 })
    ]
    expect(ids(selectFeaturedPosts(posts, 10))).toEqual(['first', 'second', 'unset-new', 'unset-old'])
  })

  it('breaks featuredOrder ties by newest first', () => {
    const posts = [
      post('old', { featured: true, featuredOrder: 1, createdAt: 1_000 }),
      post('new', { featured: true, featuredOrder: 1, createdAt: 9_000 })
    ]
    expect(ids(selectFeaturedPosts(posts))).toEqual(['new', 'old'])
  })

  it(`caps the list at ${FEATURED_LIMIT}`, () => {
    const posts = Array.from({ length: 5 }, (_, index) => post(`p${index}`, { featured: true, featuredOrder: index + 1 }))
    expect(ids(selectFeaturedPosts(posts))).toEqual(['p0', 'p1', 'p2'])
  })
})

describe('homeHeroPosts', () => {
  it('uses the featured posts when there are any', () => {
    const featured = [post('f1'), post('f2')]
    expect(ids(homeHeroPosts(featured, [post('latest')]))).toEqual(['f1', 'f2'])
  })

  it('falls back to the latest post', () => {
    expect(ids(homeHeroPosts([], [post('latest'), post('older')]))).toEqual(['latest'])
    expect(homeHeroPosts([], [])).toEqual([])
  })
})

describe('excludePosts', () => {
  it('removes the posts already shown in the hero', () => {
    expect(ids(excludePosts([post('a'), post('b'), post('c')], [post('b')]))).toEqual(['a', 'c'])
  })

  it('returns the list as-is when nothing is shown', () => {
    const posts = [post('a')]
    expect(excludePosts(posts, [])).toBe(posts)
  })
})
