/**
 * Builds blog links under `blog.basePath`: `blogPath('/tags/css')` for router links and
 * `blogUrl('/tags/css')` for absolute URLs (canonicals, share links, JSON-LD).
 */
export function useBlogPath() {
  const basePath = useRuntimeConfig().public.blog.basePath
  const siteUrl = useSiteUrl()

  const blogPath = (path = '/') => joinBlogPath(basePath, path)
  const blogUrl = (path = '/') => toBlogUrl(siteUrl, basePath, path)

  return { basePath, blogPath, blogUrl }
}
