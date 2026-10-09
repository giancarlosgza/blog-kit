import type { IMediaFile } from '#admin/shared/models/media'
import { describe, expect, it } from 'vitest'
import {
  applyMediaFilters,
  countMediaByFolder,
  emptyMediaFilters,
  hasActiveMediaFilters,
  mediaExtension,
  mediaFiltersToQuery,
  mergeMediaFiltersQuery,
  parseMediaFilters
} from '#admin/app/utils/media-filters'

function file(path: string, size: number, updated: number | null): IMediaFile {
  return {
    path,
    folder: path.split('/')[0] as IMediaFile['folder'],
    name: path.split('/').pop()!,
    size,
    contentType: 'image/webp',
    updated,
    url: null
  }
}

const files = [
  file('covers/oklch/cover.webp', 300, 3000),
  file('posts/oklch/ramp.png', 100, 1000),
  file('posts/cafe/Café-grid.webp', 500, 2000),
  file('logos/logo.svg', 50, null)
]
const usage = { 'covers/oklch/cover.webp': [{ kind: 'post-cover' as const, id: 'oklch', title: 'OKLCH', editPath: '/posts/oklch' }] }
const paths = (list: IMediaFile[]) => list.map(item => item.path)

describe('parseMediaFilters', () => {
  it('reads known values and drops unknown ones', () => {
    expect(parseMediaFilters({ q: ' ramp ', folder: 'posts', usage: 'unused', sort: 'largest', view: 'list' }))
      .toEqual({ q: 'ramp', folder: 'posts', usage: 'unused', sort: 'largest', view: 'list' })
    expect(parseMediaFilters({ folder: 'private', usage: 'maybe', sort: 'random', view: 'cards', q: ['a', 'b'] }))
      .toEqual({ q: 'a', folder: null, usage: null, sort: 'newest', view: 'grid' })
  })
})

describe('query serialization', () => {
  it('leaves defaults out and keeps unrelated params', () => {
    expect(mediaFiltersToQuery(emptyMediaFilters())).toEqual({})
    expect(mergeMediaFiltersQuery({ tab: 'x', folder: 'seo', view: 'list' }, { ...emptyMediaFilters(), usage: 'used' }))
      .toEqual({ tab: 'x', usage: 'used' })
  })

  it('round-trips', () => {
    const filters = { q: 'cover', folder: 'covers' as const, usage: 'used' as const, sort: 'name' as const, view: 'list' as const }
    expect(parseMediaFilters(mediaFiltersToQuery(filters))).toEqual(filters)
  })

  it('does not count the view as an active filter', () => {
    expect(hasActiveMediaFilters(emptyMediaFilters('list'))).toBe(false)
    expect(hasActiveMediaFilters({ ...emptyMediaFilters(), usage: 'unused' })).toBe(true)
  })
})

describe('applyMediaFilters', () => {
  it('filters by folder, usage and accent-insensitive search', () => {
    expect(paths(applyMediaFilters(files, { ...emptyMediaFilters(), folder: 'posts' }, usage))).toEqual(['posts/cafe/Café-grid.webp', 'posts/oklch/ramp.png'])
    expect(paths(applyMediaFilters(files, { ...emptyMediaFilters(), usage: 'used' }, usage))).toEqual(['covers/oklch/cover.webp'])
    expect(paths(applyMediaFilters(files, { ...emptyMediaFilters(), usage: 'unused' }, usage))).toHaveLength(3)
    expect(paths(applyMediaFilters(files, { ...emptyMediaFilters(), q: 'cafe grid' }, usage))).toEqual(['posts/cafe/Café-grid.webp'])
    expect(paths(applyMediaFilters(files, { ...emptyMediaFilters(), q: 'oklch' }, usage))).toEqual(['covers/oklch/cover.webp', 'posts/oklch/ramp.png'])
  })

  it('sorts by date, size and name', () => {
    expect(paths(applyMediaFilters(files, emptyMediaFilters(), usage))[0]).toBe('covers/oklch/cover.webp')
    expect(paths(applyMediaFilters(files, { ...emptyMediaFilters(), sort: 'oldest' }, usage))[0]).toBe('logos/logo.svg')
    expect(paths(applyMediaFilters(files, { ...emptyMediaFilters(), sort: 'largest' }, usage))[0]).toBe('posts/cafe/Café-grid.webp')
    expect(paths(applyMediaFilters(files, { ...emptyMediaFilters(), sort: 'smallest' }, usage))[0]).toBe('logos/logo.svg')
    expect(paths(applyMediaFilters(files, { ...emptyMediaFilters(), sort: 'name' }, usage))).toEqual([
      'posts/cafe/Café-grid.webp',
      'covers/oklch/cover.webp',
      'logos/logo.svg',
      'posts/oklch/ramp.png'
    ])
  })
})

describe('helpers', () => {
  it('counts files per folder', () => {
    expect(countMediaByFolder(files)).toEqual({ all: 4, covers: 1, posts: 2, authors: 0, logos: 1, seo: 0 })
  })

  it('derives the extension label', () => {
    expect(mediaExtension({ name: 'a.webp', contentType: 'image/webp' })).toBe('WEBP')
    expect(mediaExtension({ name: 'noext', contentType: 'image/png' })).toBe('PNG')
    expect(mediaExtension({ name: 'noext', contentType: null })).toBe('FILE')
  })
})
