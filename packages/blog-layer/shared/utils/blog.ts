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
