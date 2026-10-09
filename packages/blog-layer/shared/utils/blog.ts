import type { IPost } from '../models/post'

/** Convert an arbitrary string to a URL-safe slug. */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Resolve the best available author display name for a post (prefers new fields, then legacy, then `fallback`). */
export function resolveAuthorName(post: Pick<IPost, 'authorName' | 'author'>, fallback = ''): string {
  return post.authorName || post.author || fallback
}

/** Add the `.text-link` class to every prose `<a>` (merges existing classes; idempotent). */
export function decorateBlogLinks(html: string): string {
  if (!html)
    return ''

  return html.replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
    if (/\bclass\s*=\s*(["'])[^"']*\btext-link\b[^"']*\1/i.test(attrs))
      return tag

    if (/\bclass\s*=\s*["']/i.test(attrs))
      return `<a${attrs.replace(/(\bclass\s*=\s*(["']))(.*?)(\2)/i, '$1$3 text-link$4')}>`

    return `<a class="text-link"${attrs}>`
  })
}

/** Strip HTML tags and collapse whitespace to build a plain-text excerpt. */
export function htmlToExcerpt(html: string, maxLength = 160): string {
  const text = (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length <= maxLength)
    return text

  return `${text.slice(0, maxLength - 1).trimEnd()}…`
}
