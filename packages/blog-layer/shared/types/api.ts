import type { IAuthor, IPost, ISeries, ISettings, ITag } from '@giancarlosgza/blog-core'
import type { IPostHeading } from '../utils/post-headings'

/**
 * Responses of the cached public read endpoints in `server/api`. Firestore Timestamps are
 * serialized to Unix ms, so every payload is plain JSON.
 */

export interface ISettingsResponse {
  settings: ISettings | null
}

export interface ITagsResponse {
  tags: ITag[]
}

export interface IPostListResponse {
  posts: IPost[]
  hasMore: boolean
}

export interface IFeaturedPostsResponse {
  /** Published `featured` posts for the home hero, `featuredOrder` first then newest (max 3). */
  posts: IPost[]
}

export interface IPostSeriesPart {
  slug: string
  title: string
  seriesOrder: number | null
  isCurrent: boolean
}

/** The series a post belongs to, with its published parts in reading order. */
export interface IPostSeries {
  slug: string
  name: string
  description?: string
  parts: IPostSeriesPart[]
}

export interface IPostPageResponse {
  post: IPost
  /** Body already sanitized and anchored on the server; rendered as-is. */
  contents: string
  headings: IPostHeading[]
  readingTime: number
  /** Plain-text excerpt of the raw body, the SEO description fallback. */
  excerpt: string
  author: IAuthor | null
  related: IPost[]
  older: IPost | null
  newer: IPost | null
  series: IPostSeries | null
}

export interface IAuthorPageResponse extends IPostListResponse {
  author: IAuthor
}

export interface ITagPageResponse extends IPostListResponse {
  tag: string
}

/** Series names by slug, for the series badge on post cards. */
export interface ISeriesListResponse {
  series: Array<Pick<ISeries, 'slug' | 'name'>>
}

export interface ISeriesPageResponse {
  series: ISeries
  /** Published parts in reading order. */
  posts: IPost[]
}
