import type { IAuthor } from '#blog/shared/models/author'
import type { IPost } from '#blog/shared/models/post'
import type { ISeries } from '#blog/shared/models/series'
import type { ITag } from '#blog/shared/models/tag'
import { joinBlogPath } from '#blog/shared/utils/blog-path'

/**
 * Pure sitemap URL builder for `/api/blog/_sitemap-urls` (Firestore reads live in the route).
 * Kept free of Nitro/Firebase imports so it is unit-tested directly.
 */

/** Constants */
export const SITEMAP_POST_LIMIT = 5000

/** Interfaces */
type TSitemapChangefreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
type TSitemapPriority = 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1

export interface ISitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: TSitemapChangefreq
  priority?: TSitemapPriority
}

export interface ISitemapSources {
  /** Published posts, newest first. */
  posts: IPost[]
  tags: ITag[]
  authors: IAuthor[]
  series: ISeries[]
  /** Where the blog mounts (`blog.basePath`); defaults to the root. */
  basePath?: string
}

/** Helpers */
// The mappers serialize Timestamps to Unix ms, so only numbers carry a date here.
function lastmod(value: unknown): Pick<ISitemapUrl, 'lastmod'> {
  return typeof value === 'number' && value > 0 ? { lastmod: new Date(value).toISOString() } : {}
}

/**
 * Indexable published posts at `<basePath>/<slug>`, plus tag, author and series hubs.
 * `noindex` posts stay public by link but are not advertised; a series is listed
 * only once it has an indexable published part.
 */
export function buildSitemapUrls({ posts, tags, authors, series, basePath }: ISitemapSources): ISitemapUrl[] {
  const loc = (path: string) => joinBlogPath(basePath, path)
  const urls: ISitemapUrl[] = []
  const listedSeries = new Set<string>()

  for (const post of posts) {
    const slug = post.id || post.slug
    if (post.isPublished !== true || post.noindex === true || !slug)
      continue

    if (post.seriesSlug)
      listedSeries.add(post.seriesSlug)

    urls.push({ loc: loc(`/${slug}`), ...lastmod(post.updatedAt || post.createdAt), changefreq: 'weekly', priority: 0.7 })
  }

  for (const tag of tags) {
    if (tag.name)
      urls.push({ loc: loc(`/tags/${tag.name}`), changefreq: 'weekly', priority: 0.4 })
  }

  for (const author of authors) {
    if (author.slug)
      urls.push({ loc: loc(`/authors/${author.slug}`), ...lastmod(author.updatedAt), changefreq: 'weekly', priority: 0.4 })
  }

  for (const item of series) {
    const slug = item.id || item.slug
    if (listedSeries.has(slug))
      urls.push({ loc: loc(`/series/${slug}`), ...lastmod(item.updatedAt), changefreq: 'weekly', priority: 0.5 })
  }

  return urls
}
