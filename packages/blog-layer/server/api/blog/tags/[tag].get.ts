import type { H3Event } from 'h3'
import type { ITagPageResponse } from '#blog/shared/types/api'

/** Query params, normalized once for both the handler and the cache key. */
function readParams(event: H3Event) {
  return {
    tag: getRouterParam(event, 'tag', { decode: true })?.trim() ?? '',
    page: parsePage(getQuery(event).page)
  }
}

/** Published posts carrying a tag, newest first. Query: `page` (default 1). */
export default defineCachedEventHandler(async (event): Promise<ITagPageResponse> => {
  const { tag, page } = readParams(event)
  if (!tag)
    notFound(blogLabel('tagNotFound'))
  if (page === null)
    throw createError({ statusCode: 400, statusMessage: 'Invalid page' })

  try {
    const { items, hasMore } = await listPublishedPosts(page, POSTS_PAGE_SIZE, query =>
      query.where('tags', 'array-contains', tag))
    return { tag, posts: items, hasMore }
  } catch (error) {
    failRead('tag', error)
  }
}, {
  name: 'blog-tag',
  maxAge: 300,
  swr: true,
  getKey: (event) => {
    const { tag, page } = readParams(event)
    return pagedCacheKey(tag, page)
  }
})
