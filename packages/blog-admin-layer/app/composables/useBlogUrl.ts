/** Public blog origin (`NUXT_BLOG_URL`, copied into `runtimeConfig.public.blogUrl`; no trailing slash) and its bare host for display. */
export function useBlogUrl() {
  const blogUrl = String(useRuntimeConfig().public.blogUrl || '').replace(/\/+$/, '')
  const blogHost = blogUrl.replace(/^https?:\/\//, '')
  return { blogUrl, blogHost }
}
