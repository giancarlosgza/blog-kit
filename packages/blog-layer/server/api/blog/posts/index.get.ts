import type { H3Event } from 'h3'
import type { IPostListResponse } from '#blog/shared/types/api'

/** Query params, normalized once for both the handler and the cache key. */
function readParams(event: H3Event) {
  const query = getQuery(event)
  return {
    page: parsePage(query.page),
    size: parseLimit(query.limit),
    tag: parseText(query.tag)
  }
}

/**
 * Published posts newest first for the home feed and the `/page/N` archive.
 * Query: `page` (default 1), `limit` (1-50, default 12), `tag` (exact tag name).
 */
export default defineCachedEventHandler(async (event): Promise<IPostListResponse> => {
  const { page, size, tag } = readParams(event)
  if (page === null)
    throw createError({ statusCode: 400, statusMessage: 'Invalid page' })

  try {
    const { items, hasMore } = await listPublishedPosts(page, size, query =>
      tag ? query.where('tags', 'array-contains', tag) : query)
    return { posts: items, hasMore }
  } catch (error) {
    failRead('posts', error)
  }
}, {
  name: 'blog-posts',
  maxAge: 300,
  swr: true,
  getKey: event => postListCacheKey(readParams(event))
})
