import type { IPostPageResponse } from '#blog/shared/types/api'

/**
 * A published post with its sanitized body, TOC, author, related and sibling posts from the
 * cached `/api/blog/posts/[slug]`. Pages remount per slug, so the key is fixed for the instance.
 */
export function useBlogPost(slug: string) {
  return useCachedResource<IPostPageResponse>(
    `blog-post-${slug}`,
    () => $fetch<IPostPageResponse>(`/api/blog/posts/${encodeURIComponent(slug)}`)
  )
}
