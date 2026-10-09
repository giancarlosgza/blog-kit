import type { H3Event } from 'h3'
import type { IAuthorPageResponse } from '#blog/shared/types/api'
import { getFirestore } from 'firebase-admin/firestore'

/** Query params, normalized once for both the handler and the cache key. */
function readParams(event: H3Event) {
  return {
    slug: getRouterParam(event, 'slug', { decode: true })?.trim() ?? '',
    page: parsePage(getQuery(event).page)
  }
}

/** An author (by public slug) and their published posts, newest first. Query: `page` (default 1). */
export default defineCachedEventHandler(async (event): Promise<IAuthorPageResponse> => {
  const { slug, page } = readParams(event)
  if (!slug)
    notFound('Author not found')
  if (page === null)
    throw createError({ statusCode: 400, statusMessage: 'Invalid page' })

  try {
    const snapshot = await getFirestore().collection('authors').where('slug', '==', slug).limit(1).get()
    const authorDoc = snapshot.docs[0]
    if (!authorDoc)
      notFound('Author not found')

    const author = toAuthor(authorDoc.id, authorDoc.data())
    const { items, hasMore } = await listPublishedPosts(page, POSTS_PAGE_SIZE, query =>
      query.where('authorUuid', '==', authorDoc.id))
    return { author, posts: items, hasMore }
  } catch (error) {
    failRead('author', error)
  }
}, {
  name: 'blog-author',
  maxAge: 300,
  swr: true,
  getKey: (event) => {
    const { slug, page } = readParams(event)
    return pagedCacheKey(slug, page)
  }
})
