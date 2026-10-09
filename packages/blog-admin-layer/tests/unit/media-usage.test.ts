import type { IMediaFile } from '#admin/shared/models/media'
import { describe, expect, it } from 'vitest'
import { buildMediaUsage, extractImageSources, isMediaInUse, unusedMediaFiles } from '#admin/shared/utils/media'

const BUCKET = 'colorffy-blog.firebasestorage.app'
function url(path: string, bucket = BUCKET) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=t`
}
const escaped = (value: string) => value.replace(/&/g, '&amp;')

describe('extractImageSources', () => {
  it('reads src and srcset from img tags with any quoting', () => {
    const html = [
      `<p>Intro <a href="${url('posts/a/link.png')}">not an image</a></p>`,
      `<img src="${escaped(url('posts/a/one.webp'))}" alt="">`,
      `<img alt='x' src='${url('posts/a/two.webp')}'>`,
      `<IMG SRC=${escaped(url('posts/a/three.webp'))}>`,
      `<img srcset="${url('posts/a/small.webp')} 480w, ${url('posts/a/large.webp')} 1080w">`,
      '<img src="">'
    ].join('\n')
    expect(extractImageSources(html)).toEqual([
      url('posts/a/one.webp'),
      url('posts/a/two.webp'),
      url('posts/a/three.webp'),
      url('posts/a/small.webp'),
      url('posts/a/large.webp')
    ])
  })

  it('handles empty bodies', () => {
    expect(extractImageSources('')).toEqual([])
    expect(extractImageSources(null)).toEqual([])
  })
})

describe('buildMediaUsage', () => {
  const usage = buildMediaUsage({
    posts: [
      { id: 'oklch', title: 'OKLCH guide', imageURL: url('covers/oklch/cover.webp'), ogImageURL: url('seo/oklch/og.png') },
      { id: 'legacy', title: '', imagePath: 'covers/legacy/cover.jpg', imageURL: 'https://images.unsplash.com/x' },
      { id: 'shared', title: 'Shared cover', imageURL: url('covers/oklch/cover.webp') }
    ],
    bodies: [
      { id: 'oklch', contents: `<img src="${url('posts/oklch/ramp.png')}"><img src="${url('posts/oklch/ramp.png')}">` },
      { id: 'oklch', contents: `<img src="${url('posts/oklch/ramp.png')}">` },
      { id: 'orphan-draft', contents: `<img src="${url('posts/orphan/a.png')}"><img src="${url('posts/x/foreign.png', 'other-bucket')}">` }
    ],
    authors: [
      { id: 'uid-1', name: 'Ana', photoURL: url('authors/uid-1/me.webp') },
      { id: 'uid-2', name: '', photoURL: null }
    ],
    logoURL: url('logos/logo.svg')
  }, BUCKET)

  it('maps covers, SEO images, author photos and the logo', () => {
    expect(usage['covers/oklch/cover.webp']).toEqual([
      { kind: 'post-cover', id: 'oklch', title: 'OKLCH guide', editPath: '/posts/oklch' },
      { kind: 'post-cover', id: 'shared', title: 'Shared cover', editPath: '/posts/shared' }
    ])
    expect(usage['seo/oklch/og.png']).toEqual([{ kind: 'post-seo', id: 'oklch', title: 'OKLCH guide', editPath: '/posts/oklch' }])
    expect(usage['authors/uid-1/me.webp']).toEqual([{ kind: 'author-photo', id: 'uid-1', title: 'Ana', editPath: '/authors/uid-1/edit' }])
    expect(usage['logos/logo.svg']).toEqual([{ kind: 'logo', id: 'general', title: 'Blog logo', editPath: '/settings' }])
  })

  it('lists a body image once even when the draft and published body both use it', () => {
    expect(usage['posts/oklch/ramp.png']).toEqual([{ kind: 'post-body', id: 'oklch', title: 'OKLCH guide', editPath: '/posts/oklch' }])
  })

  it('matches bare imagePath values and falls back to ids for titles', () => {
    expect(usage['covers/legacy/cover.jpg']).toEqual([{ kind: 'post-cover', id: 'legacy', title: 'legacy', editPath: '/posts/legacy' }])
    expect(usage['posts/orphan/a.png']?.[0]?.title).toBe('orphan-draft')
  })

  it('ignores external URLs and other buckets', () => {
    expect(Object.keys(usage).sort()).toEqual([
      'authors/uid-1/me.webp',
      'covers/legacy/cover.jpg',
      'covers/oklch/cover.webp',
      'logos/logo.svg',
      'posts/oklch/ramp.png',
      'posts/orphan/a.png',
      'seo/oklch/og.png'
    ])
  })

  it('accepts any bucket when none is configured', () => {
    const loose = buildMediaUsage({ bodies: [{ id: 'p', contents: `<img src="${url('posts/x/foreign.png', 'other-bucket')}">` }] })
    expect(Object.keys(loose)).toEqual(['posts/x/foreign.png'])
  })

  it('returns an empty map with no sources', () => {
    expect(buildMediaUsage({})).toEqual({})
  })
})

describe('unused files', () => {
  const file = (path: string): IMediaFile => ({ path, folder: 'posts', name: path.split('/').pop()!, size: 1, contentType: 'image/png', updated: 0, url: null })
  const usage = {
    'posts/a/used.png': [{ kind: 'post-body' as const, id: 'a', title: 'A', editPath: '/posts/a' }],
    'posts/a/empty.png': []
  }

  it('treats files without usages as unused', () => {
    expect(isMediaInUse('posts/a/used.png', usage)).toBe(true)
    expect(isMediaInUse('posts/a/empty.png', usage)).toBe(false)
    expect(unusedMediaFiles([file('posts/a/used.png'), file('posts/a/empty.png'), file('posts/a/new.png')], usage).map(item => item.path))
      .toEqual(['posts/a/empty.png', 'posts/a/new.png'])
  })
})
