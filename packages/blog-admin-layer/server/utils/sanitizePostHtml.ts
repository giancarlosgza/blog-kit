import sanitizeHtml from 'sanitize-html'

/**
 * Authoritative clean for published post bodies. Runs on the draft HTML right before it is
 * copied into the public `postContents` collection.
 *
 * The editor (TipTap StarterKit + BlogWidget + Image) already normalizes HTML to a narrow
 * schema; this is the server-side source-of-truth pass that strips anything dangerous which
 * could slip through (scripts, event handlers, `javascript:` URLs, inline styles) while
 * preserving the editor's output contract:
 *   - code blocks keep `class="language-xxx"` (the blog's Shiki highlighter reads it)
 *   - widget placeholders keep `data-blog-widget` + `data-props` (the blog hydrates these)
 *   - external links get `rel="noopener nofollow"` + `target="_blank"`
 *
 * The blog's own `sanitizeBlogHtml` is regex-only defense-in-depth; this is the real clean.
 */
export function sanitizePostHtml(dirty: string): string {
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
      // `class` is needed on `code`/`pre` for `language-xxx`; harmless elsewhere
      // (class values cannot execute script). Styles are intentionally NOT allowed.
      '*': ['class'],
      'a': ['href', 'name', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      // The widget hydration contract — must survive untouched.
      'div': ['data-blog-widget', 'data-props'],
      'td': ['colspan', 'rowspan'],
      'th': ['colspan', 'rowspan']
    },
    // No `data:`/`javascript:` — links and images must be http(s) (or mailto for links).
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      // #5 — normalize external links. Internal/relative/mailto links are left as-is.
      a: (tagName, attribs) => {
        const href = attribs.href ?? ''
        if (/^https?:\/\//i.test(href)) {
          attribs.rel = 'noopener nofollow'
          attribs.target = '_blank'
        }
        return { tagName, attribs }
      },
      // Guarantee `img-fluid` on every image (merged with existing classes).
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
