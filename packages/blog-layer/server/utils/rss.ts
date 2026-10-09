import type { IFirestoreDateValue } from '#blog/shared/models/date'
import type { IPost } from '#blog/shared/models/post'
import { htmlToExcerpt, resolveAuthorName } from '#blog/shared/utils/blog'
import { toBlogUrl } from '#blog/shared/utils/blog-path'
import { toDateMs } from '#blog/shared/utils/date'
import { sanitizeBlogHtml } from '#blog/shared/utils/sanitize'

/**
 * Pure RSS 2.0 builders for `server/handlers/rss.xml.ts`: XML escaping, CDATA, RFC 822 dates,
 * feed post selection and item/channel markup. Free of Nitro/Firebase imports so they are unit-tested.
 */

/** Constants */
export const RSS_ITEM_LIMIT = 20
// Headroom so noindex posts filtered out after the query still leave a full feed.
export const RSS_QUERY_LIMIT = 50
export const RSS_DESCRIPTION_MAX = 300

// Characters XML 1.0 forbids even when escaped (C0 controls except tab/LF/CR, U+FFFE/U+FFFF).
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\v\f\u000E-\u001F\u{FFFE}\u{FFFF}]/gu

const IMAGE_TYPES: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp'
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: '\'',
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"'
}

/** Interfaces */
export interface IRssItemInput {
  post: IPost
  /** Public site origin without a trailing slash. */
  siteUrl: string
  /** Where the blog mounts on that site (`blog.basePath`); defaults to the root. */
  basePath?: string
  /** Raw `postContents` HTML; sanitized here. */
  contents?: string
  /** `dc:creator` when the post has no author name. */
  defaultAuthor?: string
}

export interface IRssChannelInput {
  title: string
  description: string
  siteUrl: string
  /** Absolute URL of the feed itself (`atom:link rel="self"`). */
  feedUrl: string
  imageUrl?: string | null
  lastBuildDate?: Date | null
  items: string[]
}

/** Text */
export function stripInvalidXmlChars(value: string): string {
  return value.replace(INVALID_XML_CHARS, '')
}

export function escapeXml(value: unknown): string {
  return stripInvalidXmlChars(String(value ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// A CDATA section cannot contain "]]>", so each one closes the section and reopens a new one.
export function toCdata(value: string): string {
  return `<![CDATA[${stripInvalidXmlChars(value).replaceAll(']]>', ']]]]><![CDATA[>')}]]>`
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const point = code[1]?.toLowerCase() === 'x'
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10)
      return Number.isInteger(point) && point > 0 && point <= 0x10FFFF ? String.fromCodePoint(point) : entity
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity
  })
}

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`
}

/** Plain-text excerpt: tags stripped before entities are decoded, so `&lt;div&gt;` stays text. */
export function htmlToPlainExcerpt(html: string, maxLength = RSS_DESCRIPTION_MAX): string {
  return truncate(clean(decodeHtmlEntities(htmlToExcerpt(html, Number.POSITIVE_INFINITY))), maxLength)
}

/** Dates */
/** RFC 822 date (`Tue, 14 Nov 2023 22:13:20 GMT`); `toUTCString` already emits that format. */
export function toRfc822Date(value: IFirestoreDateValue): string | null {
  const ms = toDateMs(value)
  return ms === null ? null : new Date(ms).toUTCString()
}

/** Posts */
export function postSlug(post: Pick<IPost, 'slug' | 'id'>): string {
  return clean(post.slug) || clean(post.id)
}

/** Newest-first published posts that may appear in the feed: indexable and addressable. */
export function selectFeedPosts(posts: IPost[], limit = RSS_ITEM_LIMIT): IPost[] {
  return posts
    .filter(post => post.isPublished === true && post.noindex !== true && postSlug(post))
    .slice(0, limit)
}

/** Newest create/update time across the feed posts, for `lastBuildDate`. */
export function latestPostDate(posts: IPost[]): Date | null {
  const times = posts.flatMap(post => [toDateMs(post.updatedAt), toDateMs(post.createdAt)])
    .filter((ms): ms is number => ms !== null)
  return times.length ? new Date(Math.max(...times)) : null
}

export function imageMimeType(url: string): string | null {
  let path: string
  try {
    // Storage URLs keep the object path encoded (`o/posts%2Fcover.webp?alt=media`).
    path = decodeURIComponent(new URL(url).pathname)
  } catch {
    return null
  }
  const extension = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase()
  return extension ? IMAGE_TYPES[extension] ?? null : null
}

// Feed readers resolve relative URLs inconsistently, so root-relative links and images become absolute.
export function absolutizeUrls(html: string, siteUrl: string): string {
  return html.replace(/(\s(?:href|src)=")\/(?!\/)/g, `$1${siteUrl}/`)
}

export function resolveFeedDescription(post: IPost, contents = ''): string {
  return clean(post.seoDescription) || clean(post.shortText) || htmlToPlainExcerpt(contents)
}

/** Markup */
export function buildRssItem({ post, siteUrl, basePath, contents = '', defaultAuthor = '' }: IRssItemInput): string {
  const origin = siteUrl.replace(/\/+$/, '')
  const link = toBlogUrl(origin, basePath, `/${postSlug(post)}`)
  const pubDate = toRfc822Date(post.createdAt)
  const description = resolveFeedDescription(post, contents)
  const body = contents ? absolutizeUrls(sanitizeBlogHtml(contents), origin) : ''
  const cover = clean(post.imageURL)
  const coverType = cover ? imageMimeType(cover) : null
  const tags = [...new Set((post.tags ?? []).map(tag => clean(tag)).filter(Boolean))]

  const lines = [
    `<title>${escapeXml(clean(post.title) || 'Article')}</title>`,
    `<link>${escapeXml(link)}</link>`,
    `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
    pubDate ? `<pubDate>${pubDate}</pubDate>` : '',
    `<dc:creator>${escapeXml(resolveAuthorName(post, defaultAuthor))}</dc:creator>`,
    ...tags.map(tag => `<category>${escapeXml(tag)}</category>`),
    `<description>${escapeXml(description)}</description>`,
    body ? `<content:encoded>${toCdata(body)}</content:encoded>` : '',
    cover && coverType ? `<enclosure url="${escapeXml(cover)}" length="0" type="${coverType}"/>` : '',
    cover
      ? `<media:content url="${escapeXml(cover)}" medium="image"${coverType ? ` type="${coverType}"` : ''}/>`
      : ''
  ]

  return `<item>\n${lines.filter(Boolean).map(line => `  ${line}`).join('\n')}\n</item>`
}

export function buildRssFeed(channel: IRssChannelInput): string {
  const siteUrl = channel.siteUrl.replace(/\/+$/, '')
  const title = escapeXml(channel.title)
  const imageUrl = clean(channel.imageUrl)
  const lines = [
    `<title>${title}</title>`,
    `<link>${escapeXml(siteUrl)}</link>`,
    `<description>${escapeXml(channel.description)}</description>`,
    '<language>en</language>',
    `<lastBuildDate>${(channel.lastBuildDate ?? new Date()).toUTCString()}</lastBuildDate>`,
    `<atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>`,
    imageUrl
      ? `<image><url>${escapeXml(imageUrl)}</url><title>${title}</title><link>${escapeXml(siteUrl)}</link></image>`
      : ''
  ]

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">',
    '<channel>',
    ...lines.filter(Boolean),
    ...channel.items,
    '</channel>',
    '</rss>',
    ''
  ].join('\n')
}
