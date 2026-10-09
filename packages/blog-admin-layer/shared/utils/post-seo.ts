import type { IPost } from '../models/post'

/**
 * Per-post SEO resolution shared by blog-admin (editor previews) and the public blog
 * (post page meta). DUPLICATED byte-identically into blog/shared/utils/post-seo.ts so the
 * editor preview always matches what the blog outputs.
 */

/** Constants */
export const SEO_TITLE_MAX = 60
export const SEO_DESCRIPTION_MAX = 160

/** Interfaces */
export type IPostSeoSource = Pick<IPost, 'slug' | 'id' | 'title' | 'shortText' | 'imageURL' | 'imageAlt' | 'seoTitle' | 'seoDescription' | 'ogImageURL' | 'canonicalURL' | 'noindex'>

export interface IPostSeoOptions {
  /** Public blog origin without a trailing slash, e.g. https://blog.example.com */
  siteUrl: string
  /** Plain-text excerpt of the body, used when neither seoDescription nor shortText is set. */
  bodyExcerpt?: string
  /** Generated OG image URL, used when the post has no custom social image or cover. */
  generatedImage?: string | null
}

export interface IResolvedPostSeo {
  title: string
  description: string
  image: string | null
  imageAlt: string
  canonical: string
  robots: 'index,follow' | 'noindex,follow'
  noindex: boolean
}

/** Helpers */
function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

export function resolvePostSeo(post: IPostSeoSource, options: IPostSeoOptions): IResolvedPostSeo {
  const siteUrl = options.siteUrl.replace(/\/+$/, '')
  const slug = clean(post.slug) || clean(post.id)
  const title = clean(post.seoTitle) || clean(post.title) || 'Article'
  const noindex = post.noindex === true

  return {
    title,
    description: clean(post.seoDescription) || clean(post.shortText) || clean(options.bodyExcerpt),
    // Custom social image beats the cover; the generated card is only a fallback.
    image: clean(post.ogImageURL) || clean(post.imageURL) || clean(options.generatedImage) || null,
    imageAlt: clean(post.imageAlt) || clean(post.title),
    canonical: clean(post.canonicalURL) || `${siteUrl}/${slug}`,
    robots: noindex ? 'noindex,follow' : 'index,follow',
    noindex
  }
}
