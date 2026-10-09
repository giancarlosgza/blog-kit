import type { IPostEditorForm } from '#admin/app/composables/usePostEditor'
import type { IPost } from '#admin/shared/models/post'

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

/** True for an absolute `http(s)://` URL with a host. */
export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname
  } catch {
    return false
  }
}

/** Editor form cover-alt and SEO fields hydrated from a post doc. */
export function postSeoFormFields(post: IPost): Pick<IPostEditorForm, 'imageAlt' | 'seoTitle' | 'seoDescription' | 'ogImageURL' | 'canonicalURL' | 'noindex'> {
  const imageAlt = post.imageAlt?.trim() || ''
  return {
    // Older saves always copied the title into imageAlt; keep those blank so the alt follows title edits.
    imageAlt: imageAlt === (post.title?.trim() || '') ? '' : imageAlt,
    seoTitle: post.seoTitle || '',
    seoDescription: post.seoDescription || '',
    ogImageURL: post.ogImageURL || '',
    canonicalURL: post.canonicalURL || '',
    noindex: post.noindex === true
  }
}

/**
 * Splits the editor's optional SEO overrides into fields to write and fields to delete, so
 * blank overrides (and `noindex: false`) are removed from the doc instead of stored empty.
 */
export function postSeoPayload(form: Pick<IPostEditorForm, 'seoTitle' | 'seoDescription' | 'ogImageURL' | 'canonicalURL' | 'noindex'>): { fields: Partial<IPost>, removed: (keyof IPost)[] } {
  const fields: Partial<IPost> = {}
  const removed: (keyof IPost)[] = []
  for (const key of ['seoTitle', 'seoDescription', 'ogImageURL', 'canonicalURL'] as const) {
    const value = form[key].trim()
    if (value)
      fields[key] = value
    else
      removed.push(key)
  }
  if (form.noindex)
    fields.noindex = true
  else
    removed.push('noindex')
  return { fields, removed }
}
