import type { IFeaturedPostsResponse } from '#blog/shared/types/api'

/**
 * Featured posts for the home hero (`featured == true`, published, max 3). Kept out of
 * `/api/posts/*` so it can never shadow a post whose slug is "featured".
 */
export default defineCachedEventHandler(async (): Promise<IFeaturedPostsResponse> => {
  try {
    return { posts: await readFeaturedPosts() }
  } catch (error) {
    failRead('featured', error)
  }
}, {
  name: 'blog-featured',
  maxAge: 300,
  swr: true,
  getKey: () => 'home'
})
