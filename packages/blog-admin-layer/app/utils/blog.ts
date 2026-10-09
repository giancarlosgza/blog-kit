import type { IPost } from '@giancarlosgza/blog-core'
import type { IPostEditorForm } from '#admin/app/composables/usePostEditor'

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
