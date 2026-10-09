import type { Query } from 'firebase-admin/firestore'
import type { IPost } from '#blog/shared/models/post'
import type { ISeries } from '#blog/shared/models/series'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Admin SDK reads for the cached public endpoints (default app from `server/plugins/firebase.ts`).
 * The Admin SDK bypasses the Firestore rules, so visibility is enforced here: every post read
 * filters on `isPublished == true` in the query AND re-checks each document (`toPublishedPosts`).
 * Public endpoints never read `postDrafts` or `admins`.
 */

/** Published posts query (base for every public post list). */
export function publishedPostsQuery(): Query {
  return getFirestore().collection('posts').where('isPublished', '==', true)
}

export async function readPublishedPosts(query: Query): Promise<IPost[]> {
  const snapshot = await query.get()
  return toPublishedPosts(snapshot.docs.map(item => ({ id: item.id, data: item.data() })))
}

/** Published posts newest first, sliced to `page` out of the first `page × size`. */
export async function listPublishedPosts(page: number, size: number, filter: (query: Query) => Query = query => query) {
  const posts = await readPublishedPosts(
    filter(publishedPostsQuery()).orderBy('createdAt', 'desc').limit(page * size)
  )
  return slicePage(posts, page, size)
}

// Both reads below use equality filters only (no orderBy), which Firestore serves by merging the
// single-field indexes, so they need no composite index; ordering happens in memory.
const SERIES_MAX_PARTS = 100
const FEATURED_SCAN_LIMIT = 50

/** Published parts of a series in reading order. */
export async function readSeriesPosts(seriesSlug: string): Promise<IPost[]> {
  const posts = await readPublishedPosts(
    publishedPostsQuery().where('seriesSlug', '==', seriesSlug).limit(SERIES_MAX_PARTS)
  )
  return sortSeriesPosts(posts)
}

export async function readSeries(slug: string): Promise<ISeries | null> {
  const snapshot = await getFirestore().collection('series').doc(slug).get()
  const data = snapshot.data()
  return data ? toSeries(snapshot.id, data) : null
}

const SERIES_LIST_LIMIT = 200

/** Every series name by slug (only the two fields cards need). */
export async function readSeriesList(): Promise<Array<Pick<ISeries, 'slug' | 'name'>>> {
  const snapshot = await getFirestore().collection('series').select('name', 'slug').limit(SERIES_LIST_LIMIT).get()
  return snapshot.docs.map((item) => {
    const series = toSeries(item.id, item.data())
    return { slug: series.slug, name: series.name || series.slug }
  })
}

/** Home hero posts (`selectFeaturedPosts`). */
export async function readFeaturedPosts(): Promise<IPost[]> {
  const posts = await readPublishedPosts(
    publishedPostsQuery().where('featured', '==', true).limit(FEATURED_SCAN_LIMIT)
  )
  return selectFeaturedPosts(posts)
}

export function notFound(statusMessage = 'Not found'): never {
  throw createError({ statusCode: 404, statusMessage })
}

/** Rethrows HTTP errors; anything else (credentials, network, quota) becomes an uncached 503. */
export function failRead(label: string, error: unknown): never {
  if (isError(error))
    throw error

  console.log(`[${label}] Firestore read failed`, error)
  throw createError({ statusCode: 503, statusMessage: 'Blog data unavailable' })
}
