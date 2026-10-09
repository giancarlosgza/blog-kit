import sanitizeHtml from 'sanitize-html'

/**
 * Client-side clean for AI-generated post HTML before it is previewed with v-html or applied to
 * the editor. Mirrors the allowlist of `server/utils/sanitizePostHtml.ts` (the authoritative pass
 * on publish), so a preview never shows markup the published post would lose.
 */
export function sanitizePostPreviewHtml(dirty: string): string {
  if (!dirty)
    return ''

  return sanitizeHtml(dirty, {
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
