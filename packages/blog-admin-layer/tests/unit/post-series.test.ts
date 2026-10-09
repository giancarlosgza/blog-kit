import type { IPost } from '#admin/shared/models/post'
import { describe, expect, it } from 'vitest'
import {
  isValidOrder,
  nextSeriesOrder,
  postFeaturedPayload,
  postSeriesFormFields,
  postSeriesPayload,
  resolveSeriesSlug,
  seriesPartsPreview,
  toOrderValue
} from '#admin/app/utils/post-series'

const seriesForm = {
  seriesSlug: '',
  seriesOrder: null,
  isNewSeries: false,
  newSeriesName: '',
  newSeriesDescription: ''
}

function part(id: string, seriesOrder?: number, isPublished = true): IPost {
  return { id, title: `Title ${id}`, isPublished, seriesSlug: 'color-basics', ...(seriesOrder === undefined ? {} : { seriesOrder }) }
}

describe('isValidOrder', () => {
  it('accepts whole numbers from 1', () => {
    expect(isValidOrder(1)).toBe(true)
    expect(isValidOrder(12)).toBe(true)
  })

  it('rejects zero, negatives, fractions and non-numbers', () => {
    expect(isValidOrder(0)).toBe(false)
    expect(isValidOrder(-2)).toBe(false)
    expect(isValidOrder(1.5)).toBe(false)
    expect(isValidOrder('2')).toBe(false)
    expect(isValidOrder(null)).toBe(false)
    expect(isValidOrder(Number.NaN)).toBe(false)
  })
})

describe('toOrderValue', () => {
  it('maps blank input to null', () => {
    expect(toOrderValue('')).toBeNull()
    expect(toOrderValue(null)).toBeNull()
    expect(toOrderValue(undefined)).toBeNull()
  })

  it('parses numbers and numeric strings', () => {
    expect(toOrderValue(3)).toBe(3)
    expect(toOrderValue('4')).toBe(4)
    expect(toOrderValue('abc')).toBeNull()
  })
})

describe('nextSeriesOrder', () => {
  it('starts an empty series at part 1', () => {
    expect(nextSeriesOrder([], 'current')).toBe(1)
  })

  it('is one past the highest part', () => {
    expect(nextSeriesOrder([part('a', 1), part('b', 4), part('c', 2)], 'current')).toBe(5)
  })

  it('ignores the current post and invalid part numbers', () => {
    expect(nextSeriesOrder([part('a', 1), part('current', 9), part('b')], 'current')).toBe(2)
  })
})

describe('seriesPartsPreview', () => {
  it('orders parts with the current post using the form values', () => {
    const preview = seriesPartsPreview(
      [part('a', 1), part('current', 1), part('c', 3, false)],
      { slug: 'current', title: 'Draft title', seriesOrder: 2, isPublished: false }
    )

    expect(preview).toEqual([
      { slug: 'a', title: 'Title a', seriesOrder: 1, isPublished: true, isCurrent: false },
      { slug: 'current', title: 'Draft title', seriesOrder: 2, isPublished: false, isCurrent: true },
      { slug: 'c', title: 'Title c', seriesOrder: 3, isPublished: false, isCurrent: false }
    ])
  })

  it('lists unnumbered parts last and falls back to the slug for a blank title', () => {
    const preview = seriesPartsPreview(
      [part('b'), part('a', 1)],
      { slug: 'current', title: ' ', seriesOrder: null, isPublished: true }
    )

    expect(preview.map(item => item.slug)).toEqual(['a', 'current', 'b'])
    expect(preview[1]?.title).toBe('current')
  })
})

describe('resolveSeriesSlug', () => {
  it('uses the picked series', () => {
    expect(resolveSeriesSlug({ ...seriesForm, seriesSlug: 'color-basics' })).toBe('color-basics')
  })

  it('slugifies a new series name', () => {
    expect(resolveSeriesSlug({ ...seriesForm, isNewSeries: true, seriesSlug: 'ignored', newSeriesName: ' CSS Layout: The Basics ' })).toBe('css-layout-the-basics')
  })
})

describe('postSeriesFormFields', () => {
  it('hydrates series and featured fields', () => {
    expect(postSeriesFormFields({ title: 'T', isPublished: true, seriesSlug: 's', seriesOrder: 2, featured: true, featuredOrder: 1 })).toEqual({
      seriesSlug: 's',
      seriesOrder: 2,
      featured: true,
      featuredOrder: 1
    })
  })

  it('defaults missing or invalid fields', () => {
    expect(postSeriesFormFields({ title: 'T', isPublished: false, seriesOrder: 0, featuredOrder: 1.5 })).toEqual({
      seriesSlug: '',
      seriesOrder: null,
      featured: false,
      featuredOrder: null
    })
  })
})

describe('postSeriesPayload', () => {
  it('removes both fields when the post is not in a series', () => {
    expect(postSeriesPayload(seriesForm)).toEqual({ fields: {}, removed: ['seriesSlug', 'seriesOrder'], create: null })
  })

  it('writes an existing series and part', () => {
    expect(postSeriesPayload({ ...seriesForm, seriesSlug: 'color-basics', seriesOrder: 3 }, [{ id: 'color-basics', slug: 'color-basics' }])).toEqual({
      fields: { seriesSlug: 'color-basics', seriesOrder: 3 },
      removed: [],
      create: null
    })
  })

  it('creates a new series from its name and description', () => {
    expect(postSeriesPayload({ ...seriesForm, isNewSeries: true, newSeriesName: ' Color Basics ', newSeriesDescription: ' Start here ', seriesOrder: 1 })).toEqual({
      fields: { seriesSlug: 'color-basics', seriesOrder: 1 },
      removed: [],
      create: { name: 'Color Basics', slug: 'color-basics', description: 'Start here' }
    })
  })

  it('omits a blank description', () => {
    expect(postSeriesPayload({ ...seriesForm, isNewSeries: true, newSeriesName: 'CSS', seriesOrder: 1 }).create).toEqual({ name: 'CSS', slug: 'css' })
  })

  it('joins an existing series instead of creating one with the same slug', () => {
    expect(postSeriesPayload({ ...seriesForm, isNewSeries: true, newSeriesName: 'Color basics', seriesOrder: 2 }, [{ id: 'color-basics', slug: 'color-basics' }]).create).toBeNull()
  })

  it('rejects a new series name without letters or numbers', () => {
    expect(() => postSeriesPayload({ ...seriesForm, isNewSeries: true, newSeriesName: '!!!', seriesOrder: 1 })).toThrow('Series name')
  })

  it('rejects an invalid part number', () => {
    expect(() => postSeriesPayload({ ...seriesForm, seriesSlug: 'color-basics', seriesOrder: null })).toThrow('Series part')
    expect(() => postSeriesPayload({ ...seriesForm, seriesSlug: 'color-basics', seriesOrder: 0 })).toThrow('Series part')
  })
})

describe('postFeaturedPayload', () => {
  it('removes both fields when not featured', () => {
    expect(postFeaturedPayload({ featured: false, featuredOrder: 2 })).toEqual({ fields: {}, removed: ['featured', 'featuredOrder'] })
  })

  it('writes the flag and drops a blank order', () => {
    expect(postFeaturedPayload({ featured: true, featuredOrder: null })).toEqual({ fields: { featured: true }, removed: ['featuredOrder'] })
  })

  it('writes the flag and order', () => {
    expect(postFeaturedPayload({ featured: true, featuredOrder: 2 })).toEqual({ fields: { featured: true, featuredOrder: 2 }, removed: [] })
  })

  it('rejects an invalid order', () => {
    expect(() => postFeaturedPayload({ featured: true, featuredOrder: 0 })).toThrow('Featured order')
  })
})
