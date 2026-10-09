import { describe, expect, it } from 'vitest'
import { joinBlogPath, normalizeBasePath, toBlogUrl } from '../src'

describe('normalizeBasePath', () => {
  it('maps the root to an empty prefix', () => {
    for (const base of ['/', '', '  ', '//', null, undefined])
      expect(normalizeBasePath(base)).toBe('')
  })

  it('adds a leading slash and drops trailing ones', () => {
    expect(normalizeBasePath('blog')).toBe('/blog')
    expect(normalizeBasePath('/blog/')).toBe('/blog')
    expect(normalizeBasePath('/en/blog//')).toBe('/en/blog')
  })
})

describe('joinBlogPath', () => {
  it('keeps root paths unchanged', () => {
    expect(joinBlogPath('/')).toBe('/')
    expect(joinBlogPath('/', '/tags/css')).toBe('/tags/css')
    expect(joinBlogPath('', 'my-post')).toBe('/my-post')
  })

  it('prefixes paths with the base path', () => {
    expect(joinBlogPath('/blog')).toBe('/blog')
    expect(joinBlogPath('/blog', '/')).toBe('/blog')
    expect(joinBlogPath('/blog/', '/tags/css')).toBe('/blog/tags/css')
    expect(joinBlogPath('blog', 'rss.xml')).toBe('/blog/rss.xml')
  })
})

describe('toBlogUrl', () => {
  it('returns the bare origin for the root home', () => {
    expect(toBlogUrl('https://blog.example.com/', '/')).toBe('https://blog.example.com')
    expect(toBlogUrl('https://blog.example.com', '/', '/my-post')).toBe('https://blog.example.com/my-post')
  })

  it('builds absolute URLs under the base path', () => {
    expect(toBlogUrl('https://example.com', '/blog')).toBe('https://example.com/blog')
    expect(toBlogUrl('https://example.com/', '/blog', '/page/2')).toBe('https://example.com/blog/page/2')
  })
})
