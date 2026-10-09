import type { IAuthor } from '#admin/shared/models/author'
import type { IFirestoreDateValue } from '#admin/shared/models/date'
import type { IPost, PostStatus } from '#admin/shared/models/post'
import { resolvePostStatus } from '#admin/shared/utils/post-status'
import { resolveAuthorName } from './blog'

/** `published` means live on the blog (isPublished); the rest match the workflow status. */
export type PostStatusFilter = PostStatus
export type PostSort = 'newest' | 'oldest' | 'updated' | 'title'

/** Posts list filters, mirrored in the URL as `?q=&status=&author=&tag=&sort=`. */
export interface IPostFilters {
  q: string | null
  status: PostStatusFilter | null
  /** Author key: the author's slug, falling back to its doc id (see `authorKey`). */
  author: string | null
  /** Tag name, as stored in `posts.tags`. */
  tag: string | null
  sort: PostSort
}

export interface IPostFilterOption<T extends string> {
  value: T
  label: string
  /** Status dot color in the filter menus. */
  iconClass?: string
}

export const DEFAULT_POST_SORT: PostSort = 'newest'

export const POST_STATUS_OPTIONS: IPostFilterOption<PostStatusFilter>[] = [
  { value: 'published', label: 'Published', iconClass: 'text-success' },
  { value: 'draft', label: 'Draft', iconClass: 'text-muted' },
  { value: 'review', label: 'In review', iconClass: 'text-secondary' },
  { value: 'changes', label: 'Changes requested', iconClass: 'text-warning' },
  { value: 'scheduled', label: 'Scheduled', iconClass: 'text-info' }
]

export const POST_SORT_OPTIONS: IPostFilterOption<PostSort>[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'title', label: 'Title A–Z' }
]

/** The URL query keys owned by the posts filters. */
export const POST_FILTER_QUERY_KEYS = ['q', 'status', 'author', 'tag', 'sort'] as const

export function emptyPostFilters(): IPostFilters {
  return { q: null, status: null, author: null, tag: null, sort: DEFAULT_POST_SORT }
}

/** First non-blank string of a route query entry (vue-router hands back string | string[] | null). */
function queryString(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string')
    return null
  const trimmed = raw.trim()
  return trimmed || null
}

function isOption<T extends string>(options: IPostFilterOption<T>[], value: string | null): value is T {
  return value !== null && options.some(option => option.value === value)
}

/** Reads the filters from a route query, dropping unknown status/sort values. */
export function parsePostFilters(query: Record<string, unknown>): IPostFilters {
  const status = queryString(query.status)
  const sort = queryString(query.sort)
  return {
    q: queryString(query.q),
    status: isOption(POST_STATUS_OPTIONS, status) ? status : null,
    author: queryString(query.author),
    tag: queryString(query.tag),
    sort: isOption(POST_SORT_OPTIONS, sort) ? sort : DEFAULT_POST_SORT
  }
}

/** Serializes the filters to query params, leaving out empty values and the default sort. */
export function postFiltersToQuery(filters: IPostFilters): Record<string, string> {
  const query: Record<string, string> = {}
  const q = filters.q?.trim()
  if (q)
    query.q = q
  if (filters.status)
    query.status = filters.status
  if (filters.author)
    query.author = filters.author
  if (filters.tag)
    query.tag = filters.tag
  if (filters.sort !== DEFAULT_POST_SORT)
    query.sort = filters.sort
  return query
}

/** Replaces the filter keys of `current` with `filters`, keeping unrelated params like `layout`. */
export function mergePostFiltersQuery<T>(current: Record<string, T>, filters: IPostFilters): Record<string, T | string> {
  const rest: Record<string, T | string> = { ...current }
  for (const key of POST_FILTER_QUERY_KEYS)
    delete rest[key]
  return { ...rest, ...postFiltersToQuery(filters) }
}

export function hasActivePostFilters(filters: IPostFilters): boolean {
  return Boolean(filters.q?.trim() || filters.status || filters.author || filters.tag || filters.sort !== DEFAULT_POST_SORT)
}

/** Stable key used for the `author` filter; slugs read better in a shared link than UIDs. */
export function authorKey(author: Pick<IAuthor, 'id' | 'uid' | 'slug'>): string {
  return author.slug || author.id || author.uid || ''
}

/** Unix ms for any stored date shape; 0 when missing or unreadable so it sorts last on "newest". */
export function toMillis(value: IFirestoreDateValue): number {
  if (value === null || value === undefined)
    return 0
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? 0 : value.getTime()
  if ('toDate' in value && typeof value.toDate === 'function')
    return value.toDate().getTime()
  if ('seconds' in value && typeof value.seconds === 'number')
    return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1e6)
  return 0
}

/** Lowercased and accent-free, so "cafe" finds "Café". */
function normalizeText(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function matchesSearch(post: IPost, q: string): boolean {
  const haystack = normalizeText([post.title, post.slug ?? post.id, post.shortText].join(' '))
  return normalizeText(q).split(/\s+/).filter(Boolean).every(term => haystack.includes(term))
}

function matchesAuthor(post: IPost, key: string, authors: IAuthor[]): boolean {
  const author = authors.find(item => authorKey(item) === key || item.id === key)
  if (!author)
    return post.authorUuid === key || post.authorSlug === key
  const ids = [author.id, author.uid].filter(Boolean)
  if (post.authorUuid)
    return ids.includes(post.authorUuid)
  if (author.slug && post.authorSlug)
    return post.authorSlug === author.slug
  // Legacy posts only carry a display name
  return normalizeText(resolveAuthorName(post)) === normalizeText(author.name)
}

function matchesTag(post: IPost, tag: string): boolean {
  const wanted = normalizeText(tag)
  return (post.tags ?? []).some(name => normalizeText(name) === wanted)
}

function matchesStatus(post: IPost, status: PostStatusFilter): boolean {
  // A live post whose next revision is in review still counts as published
  if (status === 'published')
    return post.isPublished === true
  return resolvePostStatus(post) === status
}

export function filterPosts(posts: IPost[], filters: IPostFilters, authors: IAuthor[] = []): IPost[] {
  const q = filters.q?.trim()
  return posts.filter((post) => {
    if (filters.status && !matchesStatus(post, filters.status))
      return false
    if (filters.author && !matchesAuthor(post, filters.author, authors))
      return false
    if (filters.tag && !matchesTag(post, filters.tag))
      return false
    return !q || matchesSearch(post, q)
  })
}

function compareTitles(a: IPost, b: IPost): number {
  return (a.title || a.id || '').localeCompare(b.title || b.id || '', 'en', { sensitivity: 'base', numeric: true })
}

/** Returns a sorted copy; ties fall back to title so the order is deterministic. */
export function sortPosts(posts: IPost[], sort: PostSort = DEFAULT_POST_SORT): IPost[] {
  const byDate = (read: (post: IPost) => number, direction: 1 | -1) =>
    (a: IPost, b: IPost) => (read(a) - read(b)) * direction || compareTitles(a, b)
  const created = (post: IPost) => toMillis(post.createdAt)
  const updated = (post: IPost) => toMillis(post.updatedAt) || created(post)

  const compare = {
    newest: byDate(created, -1),
    oldest: byDate(created, 1),
    updated: byDate(updated, -1),
    title: compareTitles
  }[sort] ?? byDate(created, -1)

  return [...posts].sort(compare)
}

export function applyPostFilters(posts: IPost[], filters: IPostFilters, authors: IAuthor[] = []): IPost[] {
  return sortPosts(filterPosts(posts, filters, authors), filters.sort)
}
