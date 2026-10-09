import type { IAuthor, IPost, ISeries, ISettings, ITag } from '@giancarlosgza/blog-core'
import type { IPostSeries, IPostSeriesPart } from '#blog/shared/types/api'
import { Buffer } from 'node:buffer'

/**
 * Pure helpers for the cached public read endpoints: Firestore → plain JSON mappers,
 * public visibility, query param parsing, page slicing and cache keys. Kept free of
 * Nitro/Firebase imports so they are unit-tested directly.
 */

/** Constants */
export const POSTS_PAGE_SIZE = 12
export const POSTS_MAX_LIMIT = 50
// Bounds distinct cache entries; the web SDK has no offset, so a page reads page × size docs.
export const POSTS_MAX_PAGE = 1000
export const FEATURED_LIMIT = 3

/** Interfaces */
export interface IPageSlice<T> {
  items: T[]
  hasMore: boolean
}

type TFirestoreData = Record<string, unknown>

/** Serialization */
function isTimestampLike(value: object): value is { toMillis: () => number } {
  return typeof (value as { toMillis?: unknown }).toMillis === 'function'
}

function isDocumentReferenceLike(value: object): value is { path: string } {
  return typeof (value as { path?: unknown }).path === 'string' && 'firestore' in value
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

// Timestamps become Unix ms so the payload is plain JSON and `useDateValue` still reads them.
export function serializeFirestore<T>(value: T): T {
  if (value instanceof Date)
    return value.getTime() as T
  if (Array.isArray(value))
    return value.map(item => serializeFirestore(item)) as T
  if (value && typeof value === 'object') {
    if (isTimestampLike(value))
      return value.toMillis() as T
    // References hold the whole Firestore client (circular); only their path is data.
    if (isDocumentReferenceLike(value))
      return value.path as T
    if (!isPlainObject(value))
      return String(value) as T

    return Object.fromEntries(
      Object.entries(value as TFirestoreData).map(([key, item]) => [key, serializeFirestore(item)])
    ) as T
  }
  return value
}

/** Visibility */
/** The one rule for public post visibility (drafts and unpublished posts never leave the server). */
export function isPublishedPost(data: TFirestoreData | IPost | null | undefined): boolean {
  return data?.isPublished === true
}

/** Maps a post document, or `null` when it must not be public. */
export function toPublishedPost(id: string, data: TFirestoreData | null | undefined): IPost | null {
  return data && isPublishedPost(data) ? toPost(id, data) : null
}

export function toPublishedPosts(docs: Array<{ id: string, data: TFirestoreData }>): IPost[] {
  return docs.flatMap((item) => {
    const post = toPublishedPost(item.id, item.data)
    return post ? [post] : []
  })
}

// Document id wins over a stored `id` field, matching what VueFire exposed.
export function toPost(id: string, data: TFirestoreData): IPost {
  return serializeFirestore({ ...data, id } as IPost)
}

export function toAuthor(id: string, data: TFirestoreData): IAuthor {
  return serializeFirestore({ ...data, id } as IAuthor)
}

export function toTag(id: string, data: TFirestoreData): ITag {
  return serializeFirestore({ ...data, id } as ITag)
}

export function toSettings(data: TFirestoreData): ISettings {
  return serializeFirestore(data as unknown as ISettings)
}

export function toSeries(id: string, data: TFirestoreData): ISeries {
  return serializeFirestore({ ...data, id, slug: typeof data.slug === 'string' && data.slug ? data.slug : id } as ISeries)
}

/** Series and featured */
function positiveOrder(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : Number.POSITIVE_INFINITY
}

function createdMs(post: IPost): number {
  return typeof post.createdAt === 'number' ? post.createdAt : 0
}

function compareOrder(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1
}

/** Reading order: `seriesOrder` ascending (unnumbered last), then oldest first. */
export function sortSeriesPosts(posts: IPost[]): IPost[] {
  return [...posts].sort((a, b) =>
    compareOrder(positiveOrder(a.seriesOrder), positiveOrder(b.seriesOrder))
    || createdMs(a) - createdMs(b)
    || (a.id ?? '').localeCompare(b.id ?? ''))
}

export function toSeriesParts(posts: IPost[], currentSlug: string): IPostSeriesPart[] {
  return sortSeriesPosts(posts.filter(post => isPublishedPost(post))).map((post) => {
    const slug = post.id || post.slug || ''
    return {
      slug,
      title: post.title || slug,
      seriesOrder: Number.isFinite(positiveOrder(post.seriesOrder)) ? post.seriesOrder as number : null,
      isCurrent: slug === currentSlug
    }
  })
}

export function toPostSeries(series: ISeries, posts: IPost[], currentSlug: string): IPostSeries {
  return {
    slug: series.slug,
    name: series.name || series.slug,
    ...(series.description ? { description: series.description } : {}),
    parts: toSeriesParts(posts, currentSlug)
  }
}

/** Home hero: published `featured` posts, `featuredOrder` ascending (unset last), then newest. */
export function selectFeaturedPosts(posts: IPost[], limit = FEATURED_LIMIT): IPost[] {
  return posts
    .filter(post => isPublishedPost(post) && post.featured === true)
    .sort((a, b) =>
      compareOrder(positiveOrder(a.featuredOrder), positiveOrder(b.featuredOrder))
      || createdMs(b) - createdMs(a))
    .slice(0, limit)
}

/** Query params */
function firstValue(raw: unknown): unknown {
  return Array.isArray(raw) ? raw[0] : raw
}

/** Positive page number (default 1); `null` when malformed or out of range. */
export function parsePage(raw: unknown): number | null {
  const value = firstValue(raw)
  if (value === undefined || value === null || value === '')
    return 1

  const text = String(value)
  if (!/^\d+$/.test(text))
    return null

  const page = Number.parseInt(text, 10)
  return page >= 1 && page <= POSTS_MAX_PAGE ? page : null
}

/** Page size clamped to 1…50 (default 12). */
export function parseLimit(raw: unknown): number {
  const value = Number.parseInt(String(firstValue(raw) ?? ''), 10)
  if (!Number.isFinite(value) || value < 1)
    return POSTS_PAGE_SIZE

  return Math.min(value, POSTS_MAX_LIMIT)
}

/** Trimmed non-empty string param, else `null`. */
export function parseText(raw: unknown): string | null {
  const value = firstValue(raw)
  if (typeof value !== 'string')
    return null

  return value.trim() || null
}

/** Pagination */
/**
 * Slices page `page` out of the first `page × size` results. `hasMore` mirrors the old
 * `length >= page × size` check, so an exactly full last page still offers a next page.
 */
export function slicePage<T>(items: T[], page: number, size: number): IPageSlice<T> {
  return {
    items: items.slice((page - 1) * size, page * size),
    hasMore: items.length >= page * size
  }
}

/** Cache keys */
// Nitro strips non-word characters from keys ("UI/UX" → "UIUX"), so free text is hex-encoded.
export function encodeKeyPart(value: string | null | undefined): string {
  return value ? Buffer.from(value, 'utf8').toString('hex') : 'none'
}

export function postListCacheKey(options: { page: number | null, size: number, tag: string | null }): string {
  return `page_${options.page ?? 'invalid'}_size_${options.size}_tag_${encodeKeyPart(options.tag)}`
}

export function pagedCacheKey(id: string, page: number | null): string {
  return `${encodeKeyPart(id)}_page_${page ?? 'invalid'}`
}
