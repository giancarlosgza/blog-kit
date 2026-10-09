import sanitizeHtml from 'sanitize-html'

/**
 * Server-side clean for post bodies shown with `v-html` (the post API only; the client
 * never imports it). Same allowlist as blog-admin's
 * `server/utils/sanitizePostHtml.ts` (the publish-time pass), so published markup survives untouched:
 * code blocks keep `language-xxx`, widget placeholders keep `data-blog-widget` + `data-props`,
 * external links get `rel="noopener nofollow"` + `target="_blank"` and images `img-fluid`.
 * Only addition: `id` on h2/h3, so heading ids already in the stored markup are kept for the TOC.
 */
export function sanitizeBlogHtml(html: string): string {
  if (!html)
    return ''

  return sanitizeHtml(html, {
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
      '*': ['class'],
      'a': ['href', 'name', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'div': ['data-blog-widget', 'data-props'],
      'h2': ['id'],
      'h3': ['id'],
      'td': ['colspan', 'rowspan'],
      'th': ['colspan', 'rowspan']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
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
  })
}
