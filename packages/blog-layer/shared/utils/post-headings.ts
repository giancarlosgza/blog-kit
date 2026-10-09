import { toSlug } from '@giancarlosgza/blog-core'

export interface IPostHeading {
  id: string
  text: string
  level: 2 | 3
}

export interface IPostHeadingsResult {
  html: string
  headings: IPostHeading[]
}

const WORDS_PER_MINUTE = 225
const FALLBACK_HEADING_ID = 'section'
const TAG_REGEX = /<(\/?)([a-z][\w-]*)\b([^>]*)>/gi
const ID_ATTR_REGEX = /(?:^|\s)id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i
const SKIP_ATTR_REGEX = /\bdata-blog-widget\b/i
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
  nbsp: ' '
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const point = code[1]?.toLowerCase() === 'x'
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10)
      return Number.isFinite(point) && point > 0 && point <= 0x10FFFF ? String.fromCodePoint(point) : entity
    }

    return NAMED_ENTITIES[code.toLowerCase()] ?? entity
  })
}

function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function readIdAttr(attrs: string): string | null {
  const match = attrs.match(ID_ATTR_REGEX)
  if (!match)
    return null

  return match[1] ?? match[2] ?? match[3] ?? null
}

function uniqueId(base: string, used: Set<string>): string {
  let candidate = base
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix++
  }
  used.add(candidate)
  return candidate
}

/**
 * Gives every top-level h2/h3 a stable, unique slug id and returns the TOC.
 * String-based so SSR and client produce identical markup. Existing ids are kept,
 * headings inside `<pre>` or widget placeholders are skipped (they are replaced on hydration).
 */
export function addHeadingAnchors(html: string): IPostHeadingsResult {
  if (!html)
    return { html: '', headings: [] }

  const used = new Set<string>()
  for (const match of html.matchAll(/<[a-z][\w-]*\b[^>]*>/gi)) {
    const id = readIdAttr(match[0].slice(1))
    if (id)
      used.add(id)
  }

  const lowerHtml = html.toLowerCase()
  const headings: IPostHeading[] = []
  // Tracks the element whose subtree is skipped; depth counts nested tags of the same name
  let skip: { tag: string, depth: number } | null = null

  const output = html.replace(TAG_REGEX, (tag, closing: string, rawName: string, attrs: string, offset: number) => {
    const name = rawName.toLowerCase()
    const isSelfClosing = /\/\s*$/.test(attrs)

    if (skip) {
      if (name === skip.tag && !isSelfClosing) {
        skip.depth += closing ? -1 : 1
        if (skip.depth === 0)
          skip = null
      }
      return tag
    }

    if (closing || isSelfClosing)
      return tag

    if (name === 'pre' || SKIP_ATTR_REGEX.test(attrs)) {
      skip = { tag: name, depth: 1 }
      return tag
    }

    if (name !== 'h2' && name !== 'h3')
      return tag

    const innerStart = offset + tag.length
    const closeIndex = lowerHtml.indexOf(`</${name}`, innerStart)
    const text = htmlToText(html.slice(innerStart, closeIndex === -1 ? undefined : closeIndex))
    const level = name === 'h2' ? 2 : 3
    const existingId = readIdAttr(attrs)

    if (existingId) {
      headings.push({ id: existingId, text, level })
      return tag
    }

    const id = uniqueId(toSlug(text) || FALLBACK_HEADING_ID, used)
    headings.push({ id, text, level })
    return `<${rawName} id="${id}"${attrs}>`
  })

  return { html: output, headings }
}

/** Estimated reading time in minutes (225 wpm, at least 1). */
export function estimateReadingTime(html: string): number {
  const words = htmlToText(html || '').split(' ').filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}
