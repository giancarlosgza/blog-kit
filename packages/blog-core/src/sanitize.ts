import type { IOptions } from 'sanitize-html'
import sanitizeHtml from 'sanitize-html'

/**
 * Post body sanitizers, in their own entry (`@giancarlosgza/blog-core/sanitize`) so code that only
 * needs the models and helpers never bundles `sanitize-html`.
 *
 * The allowlist keeps the editor's output contract (TipTap StarterKit + BlogWidget + Image):
 *   - code blocks keep `class="language-xxx"` (the blog's Shiki highlighter reads it)
 *   - widget placeholders keep `data-blog-widget` + `data-props` (the blog hydrates these)
 *   - external links get `rel="noopener nofollow"` + `target="_blank"`, images `img-fluid`
 * and strips scripts, event handlers, inline styles and non-http(s)/mailto URLs.
 */
function postHtmlOptions(extraAttributes: Record<string, string[]> = {}): IOptions {
  return {
    allowedTags: [
      'p',
      'br',
      'hr',
      'div',
      'span',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'b',
      'em',
      'i',
      's',
      'u',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'figure',
      'figcaption',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td'
    ],
    allowedAttributes: {
      // `class` carries `language-xxx` on code blocks; class values cannot run script
      '*': ['class'],
      'a': ['href', 'name', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'div': ['data-blog-widget', 'data-props'],
      'td': ['colspan', 'rowspan'],
      'th': ['colspan', 'rowspan'],
      ...extraAttributes
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      // Only absolute http(s) links are external; relative and mailto links stay as they are
      a: (tagName, attribs) => {
        const href = attribs.href ?? ''
        if (/^https?:\/\//i.test(href)) {
          attribs.rel = 'noopener nofollow'
          attribs.target = '_blank'
        }
        return { tagName, attribs }
      },
      img: (tagName, attribs) => {
        const classes = (attribs.class ?? '').split(/\s+/).filter(Boolean)
        if (!classes.includes('img-fluid'))
          classes.push('img-fluid')
        attribs.class = classes.join(' ')
        return { tagName, attribs }
      }
    }
  }
}

const PUBLISH_OPTIONS = postHtmlOptions()
// Heading ids already in the stored markup are kept for the table of contents
const RENDER_OPTIONS = postHtmlOptions({ h2: ['id'], h3: ['id'] })

/** Authoritative clean at publish time (admin editor and the scheduled publisher), before the body is copied into `postContents`. */
export function sanitizePostHtml(dirty: string): string {
  return dirty ? sanitizeHtml(dirty, PUBLISH_OPTIONS) : ''
}

/** Defense-in-depth clean when the blog serves a published body for `v-html`; also keeps h2/h3 ids. */
export function sanitizeBlogHtml(html: string): string {
  return html ? sanitizeHtml(html, RENDER_OPTIONS) : ''
}
