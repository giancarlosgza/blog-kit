import type { IAuthor, IPost } from '@giancarlosgza/blog-core'
import { describe, expect, it } from 'vitest'
import {
  applyPostFilters,
  authorKey,
  DEFAULT_POST_SORT,
  emptyPostFilters,
  filterPosts,
  hasActivePostFilters,
  mergePostFiltersQuery,
  parsePostFilters,
  postFiltersToQuery,
  sortPosts,
  toMillis
} from '#admin/app/utils/post-filters'

const authors: IAuthor[] = [
  { id: 'uid-gian', name: 'Giancarlos', slug: 'giancarlos' },
  { id: 'uid-ana', name: 'Ana' }
]

const posts: IPost[] = [
  { id: 'oklch-guide', title: 'OKLCH guide', shortText: 'Perceptual color spaces', isPublished: true, createdAt: 3000, updatedAt: 3500, authorUuid: 'uid-gian', tags: ['CSS', 'Color'] },
  { id: 'cafe-palettes', title: 'Café palettes', shortText: 'Warm tones', isPublished: false, createdAt: 1000, updatedAt: 9000, authorUuid: 'uid-ana', tags: ['Design'] },
  { id: 'legacy-post', title: 'Accessible contrast', shortText: 'WCAG basics', isPublished: true, createdAt: { seconds: 2 }, author: 'Giancarlos', tags: ['css'] },
  { id: 'untitled', title: '', isPublished: false }
]

const ids = (list: IPost[]) => list.map(post => post.id)

describe('parsePostFilters', () => {
  it('reads every filter from the query', () => {
    expect(parsePostFilters({ q: ' color ', status: 'draft', author: 'giancarlos', tag: 'CSS', sort: 'title' })).toEqual({
      q: 'color',
      status: 'draft',
      author: 'giancarlos',
      tag: 'CSS',
      sort: 'title'
    })
  })

  it('accepts the workflow statuses', () => {
    for (const status of ['review', 'changes', 'scheduled'])
      expect(parsePostFilters({ status }).status).toBe(status)
  })

  it('defaults missing, blank and unknown values', () => {
    expect(parsePostFilters({})).toEqual(emptyPostFilters())
    expect(parsePostFilters({ q: '  ', status: 'archived', sort: 'random' })).toEqual(emptyPostFilters())
  })

  it('takes the first value of repeated params and ignores nulls', () => {
    expect(parsePostFilters({ tag: ['CSS', 'Design'], author: [null], status: null }).tag).toBe('CSS')
    expect(parsePostFilters({ author: [null] }).author).toBeNull()
  })
})

describe('postFiltersToQuery', () => {
  it('leaves out empty values and the default sort', () => {
    expect(postFiltersToQuery(emptyPostFilters())).toEqual({})
    expect(postFiltersToQuery({ ...emptyPostFilters(), q: '  ', sort: DEFAULT_POST_SORT })).toEqual({})
  })

  it('round-trips through parsePostFilters', () => {
    const filters = { q: 'oklch', status: 'published', author: 'giancarlos', tag: 'CSS', sort: 'updated' } as const
    expect(parsePostFilters(postFiltersToQuery(filters))).toEqual(filters)
  })
})

describe('mergePostFiltersQuery', () => {
  it('replaces filter keys and keeps unrelated params', () => {
    expect(mergePostFiltersQuery({ layout: 'grid', q: 'old', tag: 'CSS' }, { ...emptyPostFilters(), status: 'draft' })).toEqual({
      layout: 'grid',
      status: 'draft'
    })
  })
})

describe('hasActivePostFilters', () => {
  it('is false for the defaults and true for any filter or a non-default sort', () => {
    expect(hasActivePostFilters(emptyPostFilters())).toBe(false)
    expect(hasActivePostFilters({ ...emptyPostFilters(), q: '   ' })).toBe(false)
    expect(hasActivePostFilters({ ...emptyPostFilters(), tag: 'CSS' })).toBe(true)
    expect(hasActivePostFilters({ ...emptyPostFilters(), sort: 'oldest' })).toBe(true)
  })
})

describe('authorKey', () => {
  it('prefers the slug and falls back to the id', () => {
    expect(authorKey({ id: 'uid-gian', slug: 'giancarlos' })).toBe('giancarlos')
    expect(authorKey({ id: 'uid-ana' })).toBe('uid-ana')
    expect(authorKey({ uid: 'uid-x' })).toBe('uid-x')
  })
})

describe('toMillis', () => {
  it('reads every stored date shape', () => {
    expect(toMillis(1234)).toBe(1234)
    expect(toMillis(new Date(5000))).toBe(5000)
    expect(toMillis('1970-01-01T00:00:01.000Z')).toBe(1000)
    expect(toMillis({ seconds: 2, nanoseconds: 500_000_000 })).toBe(2500)
    expect(toMillis({ toDate: () => new Date(42) })).toBe(42)
  })

  it('returns 0 for missing or unreadable dates', () => {
    expect(toMillis(null)).toBe(0)
    expect(toMillis(undefined)).toBe(0)
    expect(toMillis('not a date')).toBe(0)
    expect(toMillis(Number.NaN)).toBe(0)
  })
})

describe('filterPosts', () => {
  const base = emptyPostFilters()

  it('returns every post without filters', () => {
    expect(filterPosts(posts, base)).toHaveLength(posts.length)
  })

  it('searches title, slug and excerpt, ignoring case and accents', () => {
    expect(ids(filterPosts(posts, { ...base, q: 'OKLCH' }))).toEqual(['oklch-guide'])
    expect(ids(filterPosts(posts, { ...base, q: 'legacy' }))).toEqual(['legacy-post'])
    expect(ids(filterPosts(posts, { ...base, q: 'wcag' }))).toEqual(['legacy-post'])
    expect(ids(filterPosts(posts, { ...base, q: 'cafe' }))).toEqual(['cafe-palettes'])
  })

  it('requires every search term to match', () => {
    expect(ids(filterPosts(posts, { ...base, q: 'color guide' }))).toEqual(['oklch-guide'])
    expect(filterPosts(posts, { ...base, q: 'color warm' })).toEqual([])
  })

  it('filters by status', () => {
    expect(ids(filterPosts(posts, { ...base, status: 'published' }))).toEqual(['oklch-guide', 'legacy-post'])
    expect(ids(filterPosts(posts, { ...base, status: 'draft' }))).toEqual(['cafe-palettes', 'untitled'])
  })

  it('filters by workflow status, keeping live posts under published', () => {
    const workflow: IPost[] = [
      { id: 'in-review', title: 'A', isPublished: false, status: 'review' },
      { id: 'sent-back', title: 'B', isPublished: false, status: 'changes' },
      { id: 'queued', title: 'C', isPublished: false, status: 'scheduled', publishAt: 9000 },
      { id: 'live-revision', title: 'D', isPublished: true, status: 'review' },
      { id: 'legacy-draft', title: 'E', isPublished: false }
    ]
    expect(ids(filterPosts(workflow, { ...base, status: 'review' }))).toEqual(['in-review', 'live-revision'])
    expect(ids(filterPosts(workflow, { ...base, status: 'changes' }))).toEqual(['sent-back'])
    expect(ids(filterPosts(workflow, { ...base, status: 'scheduled' }))).toEqual(['queued'])
    expect(ids(filterPosts(workflow, { ...base, status: 'published' }))).toEqual(['live-revision'])
    expect(ids(filterPosts(workflow, { ...base, status: 'draft' }))).toEqual(['legacy-draft'])
  })

  it('filters by author uid, and by name for legacy posts', () => {
    expect(ids(filterPosts(posts, { ...base, author: 'giancarlos' }, authors))).toEqual(['oklch-guide', 'legacy-post'])
    expect(ids(filterPosts(posts, { ...base, author: 'uid-ana' }, authors))).toEqual(['cafe-palettes'])
  })

  it('matches an author missing from the list by uid only', () => {
    expect(ids(filterPosts(posts, { ...base, author: 'uid-ana' }))).toEqual(['cafe-palettes'])
    expect(filterPosts(posts, { ...base, author: 'nobody' }, authors)).toEqual([])
  })

  it('filters by tag case-insensitively', () => {
    expect(ids(filterPosts(posts, { ...base, tag: 'CSS' }))).toEqual(['oklch-guide', 'legacy-post'])
    expect(filterPosts(posts, { ...base, tag: 'Missing' })).toEqual([])
  })

  it('combines filters', () => {
    expect(ids(filterPosts(posts, { ...base, status: 'published', tag: 'css', q: 'contrast' }, authors))).toEqual(['legacy-post'])
  })
})

describe('sortPosts', () => {
  it('sorts newest first by default', () => {
    expect(ids(sortPosts(posts))).toEqual(['oklch-guide', 'legacy-post', 'cafe-palettes', 'untitled'])
  })

  it('sorts oldest first, missing dates first', () => {
    expect(ids(sortPosts(posts, 'oldest'))).toEqual(['untitled', 'cafe-palettes', 'legacy-post', 'oklch-guide'])
  })

  it('sorts by last update, falling back to creation date', () => {
    expect(ids(sortPosts(posts, 'updated'))).toEqual(['cafe-palettes', 'oklch-guide', 'legacy-post', 'untitled'])
  })

  it('sorts titles A–Z, using the slug for untitled posts', () => {
    expect(ids(sortPosts(posts, 'title'))).toEqual(['legacy-post', 'cafe-palettes', 'oklch-guide', 'untitled'])
  })

  it('does not mutate the input', () => {
    const copy = [...posts]
    sortPosts(posts, 'title')
    expect(posts).toEqual(copy)
  })
})

describe('applyPostFilters', () => {
  it('filters then sorts', () => {
    expect(ids(applyPostFilters(posts, { ...emptyPostFilters(), status: 'draft', sort: 'title' }))).toEqual(['cafe-palettes', 'untitled'])
  })
})
