import { describe, expect, it } from 'vitest'
import { htmlToExcerpt, isAbsoluteHttpUrl, postSeoFormFields, postSeoPayload, resolveAuthorName, toSlug } from '#admin/app/utils/blog'

describe('toSlug', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(toSlug('Accessible Color Palettes')).toBe('accessible-color-palettes')
  })

  it('drops punctuation and collapses separators', () => {
    expect(toSlug('  OKLCH vs. OKLab: what\'s new?  ')).toBe('oklch-vs-oklab-whats-new')
    expect(toSlug('css__tips -- 2026')).toBe('css-tips-2026')
  })

  it('trims leading and trailing hyphens', () => {
    expect(toSlug('--Hello World--')).toBe('hello-world')
  })

  it('returns an empty string when nothing is left', () => {
    expect(toSlug('!!!')).toBe('')
  })
})

describe('resolveAuthorName', () => {
  it('prefers the new authorName field', () => {
    expect(resolveAuthorName({ authorName: 'Giancarlos', author: 'Legacy' })).toBe('Giancarlos')
  })

  it('falls back to the legacy author field, then to the given fallback', () => {
    expect(resolveAuthorName({ author: 'Legacy' }, 'Brand')).toBe('Legacy')
    expect(resolveAuthorName({}, 'Brand')).toBe('Brand')
    expect(resolveAuthorName({})).toBe('')
  })
})

describe('htmlToExcerpt', () => {
  it('strips tags and collapses whitespace', () => {
    expect(htmlToExcerpt('<h2>Title</h2>\n<p>Some <strong>bold</strong>   text.</p>')).toBe('Title Some bold text.')
  })

  it('keeps short text as-is', () => {
    expect(htmlToExcerpt('<p>Short</p>', 10)).toBe('Short')
  })

  it('truncates long text with an ellipsis within the limit', () => {
    const excerpt = htmlToExcerpt(`<p>${'word '.repeat(50)}</p>`, 20)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBeLessThanOrEqual(20)
  })

  it('handles empty input', () => {
    expect(htmlToExcerpt('')).toBe('')
  })
})

describe('isAbsoluteHttpUrl', () => {
  it('accepts absolute http(s) URLs', () => {
    expect(isAbsoluteHttpUrl('https://example.com/post')).toBe(true)
    expect(isAbsoluteHttpUrl(' http://example.com ')).toBe(true)
  })

  it('rejects relative, non-http and garbage values', () => {
    expect(isAbsoluteHttpUrl('/post')).toBe(false)
    expect(isAbsoluteHttpUrl('example.com/post')).toBe(false)
    expect(isAbsoluteHttpUrl('ftp://example.com')).toBe(false)
    expect(isAbsoluteHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isAbsoluteHttpUrl('')).toBe(false)
  })
})

describe('postSeoFormFields', () => {
  it('hydrates the SEO overrides', () => {
    expect(postSeoFormFields({ title: 'T', isPublished: true, imageAlt: 'Alt', seoTitle: 'S', seoDescription: 'D', ogImageURL: 'https://i', canonicalURL: 'https://c', noindex: true })).toEqual({
      imageAlt: 'Alt',
      seoTitle: 'S',
      seoDescription: 'D',
      ogImageURL: 'https://i',
      canonicalURL: 'https://c',
      noindex: true
    })
  })

  it('leaves the alt blank when it only copies the title', () => {
    expect(postSeoFormFields({ title: 'Same', imageAlt: 'Same', isPublished: false }).imageAlt).toBe('')
  })

  it('defaults missing fields', () => {
    expect(postSeoFormFields({ title: 'T', isPublished: false })).toEqual({ imageAlt: '', seoTitle: '', seoDescription: '', ogImageURL: '', canonicalURL: '', noindex: false })
  })
})

describe('postSeoPayload', () => {
  it('writes trimmed overrides and noindex true', () => {
    expect(postSeoPayload({ seoTitle: ' S ', seoDescription: 'D', ogImageURL: 'https://i', canonicalURL: 'https://c', noindex: true })).toEqual({
      fields: { seoTitle: 'S', seoDescription: 'D', ogImageURL: 'https://i', canonicalURL: 'https://c', noindex: true },
      removed: []
    })
  })

  it('removes blank overrides and noindex false', () => {
    expect(postSeoPayload({ seoTitle: ' ', seoDescription: '', ogImageURL: '', canonicalURL: '', noindex: false })).toEqual({
      fields: {},
      removed: ['seoTitle', 'seoDescription', 'ogImageURL', 'canonicalURL', 'noindex']
    })
  })
})
