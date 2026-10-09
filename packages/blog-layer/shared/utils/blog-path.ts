/**
 * Blog URL helpers. The blog mounts under `blog.basePath` (nuxt.config): `/` for a standalone blog,
 * e.g. `/blog` when it is embedded in another site. Shared by pages, RSS, sitemap and SEO.
 */

/** `''` for the site root, otherwise `/segment(s)` with a leading and no trailing slash. */
export function normalizeBasePath(base?: string | null): string {
  const trimmed = (base ?? '').trim().replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}` : ''
}

/** Blog-relative path → site path: (`/blog`, `/tags/css`) → `/blog/tags/css`; the root home is `/`. */
export function joinBlogPath(base: string | null | undefined, path = '/'): string {
  const relative = path.replace(/^\/+/, '')
  return `${normalizeBasePath(base)}${relative ? `/${relative}` : ''}` || '/'
}

/** Absolute blog URL. The root home is the bare origin (`https://blog.example.com`, no trailing slash). */
export function toBlogUrl(siteUrl: string, base: string | null | undefined, path = '/'): string {
  const origin = siteUrl.replace(/\/+$/, '')
  const sitePath = joinBlogPath(base, path)
  return sitePath === '/' ? origin : `${origin}${sitePath}`
}
