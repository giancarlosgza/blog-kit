import { describe, expect, it } from 'vitest'
import { isAbsoluteHttpUrl, postSeoFormFields, postSeoPayload } from '#admin/app/utils/blog'

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
