import type { IPostSeoSource } from '#blog/shared/utils/post-seo'
import { describe, expect, it } from 'vitest'
import { resolvePostSeo } from '#blog/shared/utils/post-seo'

const SITE = 'https://blog.colorffy.com'
const base: IPostSeoSource = { slug: 'oklch-colors', title: 'OKLCH colors' }

describe('resolvePostSeo', () => {
  it('falls back from seoTitle to title to a default', () => {
    expect(resolvePostSeo({ ...base, seoTitle: 'Custom title' }, { siteUrl: SITE }).title).toBe('Custom title')
    expect(resolvePostSeo(base, { siteUrl: SITE }).title).toBe('OKLCH colors')
    expect(resolvePostSeo({ ...base, title: '' }, { siteUrl: SITE }).title).toBe('Article')
  })

  it('falls back from seoDescription to shortText to the body excerpt', () => {
    const options = { siteUrl: SITE, bodyExcerpt: 'From the body.' }
    expect(resolvePostSeo({ ...base, seoDescription: 'Custom', shortText: 'Short' }, options).description).toBe('Custom')
    expect(resolvePostSeo({ ...base, shortText: 'Short' }, options).description).toBe('Short')
    expect(resolvePostSeo(base, options).description).toBe('From the body.')
    expect(resolvePostSeo(base, { siteUrl: SITE }).description).toBe('')
  })

  it('prefers the custom social image, then the cover, then the generated image', () => {
    const options = { siteUrl: SITE, generatedImage: 'https://blog.colorffy.com/_og/card.png' }
    const cover = { ...base, imageURL: 'https://cdn.dev/cover.webp' }
    expect(resolvePostSeo({ ...cover, ogImageURL: 'https://cdn.dev/og.png' }, options).image).toBe('https://cdn.dev/og.png')
    expect(resolvePostSeo(cover, options).image).toBe('https://cdn.dev/cover.webp')
    expect(resolvePostSeo(base, options).image).toBe('https://blog.colorffy.com/_og/card.png')
    expect(resolvePostSeo(base, { siteUrl: SITE }).image).toBeNull()
    expect(resolvePostSeo(base, { siteUrl: SITE, generatedImage: null }).image).toBeNull()
  })

  it('uses the cover alt, then the title, for the image alt', () => {
    expect(resolvePostSeo({ ...base, imageAlt: 'A gradient' }, { siteUrl: SITE }).imageAlt).toBe('A gradient')
    expect(resolvePostSeo({ ...base, seoTitle: 'SEO title' }, { siteUrl: SITE }).imageAlt).toBe('OKLCH colors')
  })

  it('defaults the canonical to the post URL and honors an override', () => {
    expect(resolvePostSeo(base, { siteUrl: SITE }).canonical).toBe(`${SITE}/oklch-colors`)
    expect(resolvePostSeo(base, { siteUrl: `${SITE}//` }).canonical).toBe(`${SITE}/oklch-colors`)
    expect(resolvePostSeo({ id: 'from-id', title: 'T' }, { siteUrl: SITE }).canonical).toBe(`${SITE}/from-id`)
    expect(resolvePostSeo({ ...base, canonicalURL: 'https://dev.to/colorffy/oklch' }, { siteUrl: SITE }).canonical).toBe('https://dev.to/colorffy/oklch')
    expect(resolvePostSeo(base, { siteUrl: SITE, basePath: '/blog' }).canonical).toBe(`${SITE}/blog/oklch-colors`)
  })

  it('maps noindex to robots', () => {
    expect(resolvePostSeo(base, { siteUrl: SITE })).toMatchObject({ robots: 'index,follow', noindex: false })
    expect(resolvePostSeo({ ...base, noindex: true }, { siteUrl: SITE })).toMatchObject({ robots: 'noindex,follow', noindex: true })
    expect(resolvePostSeo({ ...base, noindex: false }, { siteUrl: SITE }).robots).toBe('index,follow')
  })

  it('collapses whitespace and treats blank overrides as unset', () => {
    const seo = resolvePostSeo({
      ...base,
      seoTitle: '   ',
      seoDescription: '\n\t',
      shortText: '  Multi   line\n summary  ',
      ogImageURL: '  ',
      canonicalURL: ' ',
      imageURL: ' https://cdn.dev/cover.webp '
    }, { siteUrl: SITE })
    expect(seo.title).toBe('OKLCH colors')
    expect(seo.description).toBe('Multi line summary')
    expect(seo.image).toBe('https://cdn.dev/cover.webp')
    expect(seo.canonical).toBe(`${SITE}/oklch-colors`)
    expect(resolvePostSeo({ ...base, seoTitle: '  Spaced   title ' }, { siteUrl: SITE }).title).toBe('Spaced title')
  })
})
