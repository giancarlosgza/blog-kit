import type { IPostSeoSource } from '#admin/shared/utils/post-seo'
import { describe, expect, it } from 'vitest'
import { resolvePostSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from '#admin/shared/utils/post-seo'

const siteUrl = 'https://blog.colorffy.com'
const base: IPostSeoSource = { slug: 'accessible-palettes', title: 'Accessible palettes' }

describe('resolvePostSeo', () => {
  it('exposes the search limits', () => {
    expect(SEO_TITLE_MAX).toBe(60)
    expect(SEO_DESCRIPTION_MAX).toBe(160)
  })

  describe('title', () => {
    it('prefers seoTitle over the post title', () => {
      expect(resolvePostSeo({ ...base, seoTitle: 'Build accessible palettes' }, { siteUrl }).title).toBe('Build accessible palettes')
    })

    it('falls back to the post title when seoTitle is blank', () => {
      expect(resolvePostSeo({ ...base, seoTitle: '   ' }, { siteUrl }).title).toBe('Accessible palettes')
    })

    it('falls back to "Article" when there is no title at all', () => {
      expect(resolvePostSeo({ slug: 'x', title: '' }, { siteUrl }).title).toBe('Article')
    })
  })

  describe('description', () => {
    it('prefers seoDescription, then shortText, then the body excerpt', () => {
      const post = { ...base, seoDescription: 'SEO copy', shortText: 'Excerpt copy' }
      expect(resolvePostSeo(post, { siteUrl, bodyExcerpt: 'Body copy' }).description).toBe('SEO copy')
      expect(resolvePostSeo({ ...post, seoDescription: '' }, { siteUrl, bodyExcerpt: 'Body copy' }).description).toBe('Excerpt copy')
      expect(resolvePostSeo({ ...post, seoDescription: '', shortText: ' ' }, { siteUrl, bodyExcerpt: 'Body copy' }).description).toBe('Body copy')
    })

    it('is empty when nothing is available', () => {
      expect(resolvePostSeo(base, { siteUrl }).description).toBe('')
    })
  })

  describe('image', () => {
    const images = { ogImageURL: 'https://cdn.example/og.webp', imageURL: 'https://cdn.example/cover.webp' }
    const generatedImage = 'https://blog.example/_og/card.png'

    it('uses ogImageURL, then the cover, then the generated image, then null', () => {
      expect(resolvePostSeo({ ...base, ...images }, { siteUrl, generatedImage }).image).toBe(images.ogImageURL)
      expect(resolvePostSeo({ ...base, ...images, ogImageURL: '' }, { siteUrl, generatedImage }).image).toBe(images.imageURL)
      expect(resolvePostSeo(base, { siteUrl, generatedImage }).image).toBe(generatedImage)
      expect(resolvePostSeo(base, { siteUrl, generatedImage: null }).image).toBeNull()
      expect(resolvePostSeo(base, { siteUrl }).image).toBeNull()
    })

    it('uses imageAlt and falls back to the post title', () => {
      expect(resolvePostSeo({ ...base, imageAlt: 'Swatches on a grid' }, { siteUrl }).imageAlt).toBe('Swatches on a grid')
      expect(resolvePostSeo({ ...base, imageAlt: '  ' }, { siteUrl }).imageAlt).toBe('Accessible palettes')
    })

    it('does not use seoTitle as the alt fallback', () => {
      expect(resolvePostSeo({ ...base, seoTitle: 'SEO title' }, { siteUrl }).imageAlt).toBe('Accessible palettes')
    })
  })

  describe('canonical', () => {
    it('defaults to the post URL and strips trailing slashes from siteUrl', () => {
      expect(resolvePostSeo(base, { siteUrl }).canonical).toBe('https://blog.colorffy.com/accessible-palettes')
      expect(resolvePostSeo(base, { siteUrl: 'https://blog.colorffy.com//' }).canonical).toBe('https://blog.colorffy.com/accessible-palettes')
    })

    it('falls back to the doc id when there is no slug', () => {
      expect(resolvePostSeo({ id: 'from-id', title: 'T' }, { siteUrl }).canonical).toBe('https://blog.colorffy.com/from-id')
    })

    it('uses the canonicalURL override', () => {
      expect(resolvePostSeo({ ...base, canonicalURL: ' https://example.com/original ' }, { siteUrl }).canonical).toBe('https://example.com/original')
    })
  })

  describe('robots', () => {
    it('indexes by default', () => {
      const seo = resolvePostSeo(base, { siteUrl })
      expect(seo.robots).toBe('index,follow')
      expect(seo.noindex).toBe(false)
    })

    it('only treats noindex === true as hidden', () => {
      const hidden = resolvePostSeo({ ...base, noindex: true }, { siteUrl })
      expect(hidden.robots).toBe('noindex,follow')
      expect(hidden.noindex).toBe(true)
      expect(resolvePostSeo({ ...base, noindex: false }, { siteUrl }).noindex).toBe(false)
    })
  })

  it('collapses whitespace in every text field', () => {
    const seo = resolvePostSeo({
      slug: '  spaced  ',
      title: '  Two\n\nlines  ',
      seoDescription: ' A\t\tdescription\nhere ',
      imageAlt: ' Alt   text '
    }, { siteUrl })
    expect(seo.title).toBe('Two lines')
    expect(seo.description).toBe('A description here')
    expect(seo.imageAlt).toBe('Alt text')
    expect(seo.canonical).toBe('https://blog.colorffy.com/spaced')
  })
})
