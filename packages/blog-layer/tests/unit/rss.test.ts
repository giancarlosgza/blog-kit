import type { IPost } from '#blog/shared/models/post'
import { describe, expect, it } from 'vitest'
import {
  absolutizeUrls,
  buildRssFeed,
  buildRssItem,
  decodeHtmlEntities,
  escapeXml,
  htmlToPlainExcerpt,
  imageMimeType,
  latestPostDate,
  RSS_ITEM_LIMIT,
  selectFeedPosts,
  toCdata,
  toRfc822Date
} from '../../server/utils/rss'

const SITE = 'https://blog.colorffy.com'
const base: IPost = {
  id: 'oklch-colors',
  slug: 'oklch-colors',
  title: 'OKLCH colors',
  isPublished: true,
  createdAt: 1_700_000_000_000
}

function post(overrides: Partial<IPost> = {}): IPost {
  return { ...base, ...overrides }
}

function cdataText(xml: string): string {
  return [...xml.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map(match => match[1]).join('')
}

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml('Tom & "Jerry" <b>\'s</b>')).toBe('Tom &amp; &quot;Jerry&quot; &lt;b&gt;&apos;s&lt;/b&gt;')
  })

  it('escapes existing entities again instead of trusting them', () => {
    expect(escapeXml('&amp;')).toBe('&amp;amp;')
  })

  it('drops characters XML 1.0 cannot carry and keeps tab/newline', () => {
    const input = `a${String.fromCharCode(0)}b${String.fromCharCode(0x0B)}c\t\n${String.fromCharCode(0xFFFE)}d`
    expect(escapeXml(input)).toBe('abc\t\nd')
  })

  it('stringifies nullish values as empty', () => {
    expect(escapeXml(null)).toBe('')
    expect(escapeXml(undefined)).toBe('')
  })
})

describe('toCdata', () => {
  it('wraps HTML without escaping it', () => {
    expect(toCdata('<p>A & B</p>')).toBe('<![CDATA[<p>A & B</p>]]>')
  })

  it('splits every "]]>" so the section never closes early', () => {
    const wrapped = toCdata('<code>a[b[0]]>c</code> and ]]>')
    expect(wrapped).toBe('<![CDATA[<code>a[b[0]]]]><![CDATA[>c</code> and ]]]]><![CDATA[>]]>')
    expect(cdataText(wrapped)).toBe('<code>a[b[0]]>c</code> and ]]>')
  })
})

describe('toRfc822Date', () => {
  it('formats Unix ms as an RFC 822 GMT date', () => {
    expect(toRfc822Date(1_700_000_000_000)).toBe('Tue, 14 Nov 2023 22:13:20 GMT')
  })

  it('accepts seconds, Dates, ISO strings and serialized timestamps', () => {
    expect(toRfc822Date(1_700_000_000)).toBe('Tue, 14 Nov 2023 22:13:20 GMT')
    expect(toRfc822Date(new Date(Date.UTC(2024, 0, 5, 9, 3, 7)))).toBe('Fri, 05 Jan 2024 09:03:07 GMT')
    expect(toRfc822Date('2024-01-05T09:03:07Z')).toBe('Fri, 05 Jan 2024 09:03:07 GMT')
    expect(toRfc822Date({ seconds: 1_700_000_000 })).toBe('Tue, 14 Nov 2023 22:13:20 GMT')
  })

  it('returns null for missing or invalid dates', () => {
    expect(toRfc822Date(undefined)).toBeNull()
    expect(toRfc822Date(0)).toBeNull()
    expect(toRfc822Date('not a date')).toBeNull()
  })
})

describe('selectFeedPosts', () => {
  it('excludes noindex, unpublished and slugless posts', () => {
    const posts = [
      post({ id: 'a', slug: 'a' }),
      post({ id: 'hidden', slug: 'hidden', noindex: true }),
      post({ id: 'draft', slug: 'draft', isPublished: false }),
      post({ id: '', slug: '' }),
      post({ id: 'b', slug: 'b', noindex: false })
    ]
    expect(selectFeedPosts(posts).map(item => item.slug)).toEqual(['a', 'b'])
  })

  it('caps the feed at the item limit, keeping order', () => {
    const posts = Array.from({ length: 30 }, (_, index) => post({ id: `p${index}`, slug: `p${index}` }))
    const selected = selectFeedPosts(posts)
    expect(selected).toHaveLength(RSS_ITEM_LIMIT)
    expect(selected[0]?.slug).toBe('p0')
  })

  it('fills the limit from later posts when some are noindex', () => {
    const posts = Array.from({ length: 25 }, (_, index) =>
      post({ id: `p${index}`, slug: `p${index}`, noindex: index < 5 }))
    const selected = selectFeedPosts(posts)
    expect(selected).toHaveLength(20)
    expect(selected.every(item => !item.noindex)).toBe(true)
  })
})

describe('buildRssItem', () => {
  it('links and guids the post URL as a permalink', () => {
    const xml = buildRssItem({ post: base, siteUrl: `${SITE}/` })
    expect(xml).toContain(`<link>${SITE}/oklch-colors</link>`)
    expect(xml).toContain(`<guid isPermaLink="true">${SITE}/oklch-colors</guid>`)
    expect(xml).toContain('<pubDate>Tue, 14 Nov 2023 22:13:20 GMT</pubDate>')
  })

  it('links posts under the base path', () => {
    const xml = buildRssItem({ post: base, siteUrl: SITE, basePath: '/blog' })
    expect(xml).toContain(`<link>${SITE}/blog/oklch-colors</link>`)
  })

  it('uses the post title, not the SEO title', () => {
    const xml = buildRssItem({ post: post({ title: 'Colors & <CSS>', seoTitle: 'SEO title' }), siteUrl: SITE })
    expect(xml).toContain('<title>Colors &amp; &lt;CSS&gt;</title>')
    expect(xml).not.toContain('SEO title')
  })

  it('emits one category per distinct tag', () => {
    const xml = buildRssItem({ post: post({ tags: ['CSS', 'UI/UX', 'CSS', ' ', 'R&D'] }), siteUrl: SITE })
    expect([...xml.matchAll(/<category>(.*?)<\/category>/g)].map(match => match[1])).toEqual(['CSS', 'UI/UX', 'R&amp;D'])
  })

  it('credits the author, falling back to the legacy field and the brand', () => {
    expect(buildRssItem({ post: post({ authorName: 'Gian' }), siteUrl: SITE })).toContain('<dc:creator>Gian</dc:creator>')
    expect(buildRssItem({ post: post({ author: 'Eli' }), siteUrl: SITE })).toContain('<dc:creator>Eli</dc:creator>')
    expect(buildRssItem({ post: base, siteUrl: SITE, defaultAuthor: 'Colorffy' })).toContain('<dc:creator>Colorffy</dc:creator>')
  })

  it('describes with seoDescription, then shortText, then a plain-text body excerpt', () => {
    const contents = '<p>Body &amp; <strong>more</strong> &lt;div&gt;</p>'
    expect(buildRssItem({ post: post({ seoDescription: 'SEO', shortText: 'Short' }), siteUrl: SITE, contents }))
      .toContain('<description>SEO</description>')
    expect(buildRssItem({ post: post({ shortText: 'Short' }), siteUrl: SITE, contents }))
      .toContain('<description>Short</description>')
    expect(buildRssItem({ post: base, siteUrl: SITE, contents }))
      .toContain('<description>Body &amp; more &lt;div&gt;</description>')
  })

  it('embeds the sanitized body in CDATA with absolute URLs', () => {
    const contents = '<p onclick="x()">Hi <a href="/other">link</a></p><script>alert(1)</script><pre><code>a[b[0]]>c</code></pre>'
    const xml = buildRssItem({ post: base, siteUrl: SITE, contents })
    const body = cdataText(xml)
    expect(body).toContain(`<a href="${SITE}/other">link</a>`)
    expect(body).toContain('a[b[0]]&gt;c')
    expect(body).not.toContain('onclick')
    expect(body).not.toContain('<script')
    expect(xml).toMatch(/<content:encoded><!\[CDATA\[[\s\S]*\]\]><\/content:encoded>/)
  })

  it('omits content:encoded when the body is empty', () => {
    expect(buildRssItem({ post: base, siteUrl: SITE })).not.toContain('content:encoded')
  })

  it('attaches the cover as an enclosure and media:content', () => {
    const imageURL = 'https://firebasestorage.googleapis.com/v0/b/app/o/posts%2Fcover.webp?alt=media&token=1'
    const xml = buildRssItem({ post: post({ imageURL }), siteUrl: SITE })
    const escaped = imageURL.replace('&', '&amp;')
    expect(xml).toContain(`<enclosure url="${escaped}" length="0" type="image/webp"/>`)
    expect(xml).toContain(`<media:content url="${escaped}" medium="image" type="image/webp"/>`)
  })

  it('skips the enclosure when the image type is unknown, and all media without a cover', () => {
    const unknown = buildRssItem({ post: post({ imageURL: 'https://cdn.dev/cover' }), siteUrl: SITE })
    expect(unknown).not.toContain('<enclosure')
    expect(unknown).toContain('<media:content url="https://cdn.dev/cover" medium="image"/>')
    expect(buildRssItem({ post: base, siteUrl: SITE })).not.toContain('media:content')
  })
})

describe('buildRssFeed', () => {
  it('wraps items in an RSS 2.0 channel with a self link', () => {
    const xml = buildRssFeed({
      title: 'The Colorffy Blog',
      description: 'Color & CSS',
      siteUrl: `${SITE}/`,
      feedUrl: `${SITE}/rss.xml`,
      imageUrl: 'https://cdn.dev/logo.png',
      lastBuildDate: new Date(1_700_000_000_000),
      items: ['<item></item>']
    })
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain(`<link>${SITE}</link>`)
    expect(xml).toContain('<description>Color &amp; CSS</description>')
    expect(xml).toContain('<language>en</language>')
    expect(xml).toContain('<lastBuildDate>Tue, 14 Nov 2023 22:13:20 GMT</lastBuildDate>')
    expect(xml).toContain(`<atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>`)
    expect(xml).toContain('<image><url>https://cdn.dev/logo.png</url>')
    expect(xml).toContain('<item></item>\n</channel>\n</rss>')
  })
})

describe('helpers', () => {
  it('decodes named and numeric entities, leaving unknown ones', () => {
    expect(decodeHtmlEntities('&lt;a&gt; &amp; &#39;x&#x27; &nbsp;&copy;')).toBe('<a> & \'x\'  &copy;')
  })

  it('builds a truncated plain-text excerpt', () => {
    expect(htmlToPlainExcerpt('<p>One</p><p>two&nbsp;three</p>')).toBe('One two three')
    expect(htmlToPlainExcerpt('<p>abcdefghij</p>', 6)).toBe('abcde…')
  })

  it('maps image extensions to MIME types', () => {
    expect(imageMimeType('https://cdn.dev/a.JPG?x=1')).toBe('image/jpeg')
    expect(imageMimeType('https://cdn.dev/a.svg')).toBe('image/svg+xml')
    expect(imageMimeType('https://cdn.dev/a.bin')).toBeNull()
    expect(imageMimeType('not a url')).toBeNull()
  })

  it('absolutizes root-relative href/src only', () => {
    const html = '<a href="/a">a</a><img src="/b.png"><a href="//cdn.dev/c">c</a><a href="https://x.dev/d">d</a>'
    expect(absolutizeUrls(html, SITE)).toBe(`<a href="${SITE}/a">a</a><img src="${SITE}/b.png"><a href="//cdn.dev/c">c</a><a href="https://x.dev/d">d</a>`)
  })

  it('takes the newest create or update date for lastBuildDate', () => {
    expect(latestPostDate([post({ createdAt: 1_000_000_000_000, updatedAt: 1_700_000_000_000 }), base])?.getTime())
      .toBe(1_700_000_000_000)
    expect(latestPostDate([])).toBeNull()
  })
})
