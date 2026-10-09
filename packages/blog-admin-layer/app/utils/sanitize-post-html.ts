import { sanitizePostHtml } from '@giancarlosgza/blog-core/sanitize'

/**
 * Client-side clean for AI-generated post HTML before it is previewed with v-html or applied to
 * the editor. Same pass as publishing, so a preview never shows markup the published post would lose.
 */
export function sanitizePostPreviewHtml(dirty: string): string {
  return sanitizePostHtml(dirty)
}
