import { describe, expect, it } from 'vitest'
import { addHeadingAnchors } from '#blog/shared/utils/post-headings'
import { sanitizeBlogHtml } from '#blog/shared/utils/sanitize'

describe('sanitizeBlogHtml', () => {
  it('removes scripts and inline event handlers', () => {
    const html = sanitizeBlogHtml('<p onclick="alert(1)">Hi</p><script>alert(1)</script><img src="https://x.dev/a.png" onerror="alert(1)">')
    expect(html).not.toMatch(/script|onclick|onerror|alert/i)
    expect(html).toContain('<p>Hi</p>')
  })

  it('drops javascript: and data: URLs', () => {
    expect(sanitizeBlogHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:')
    expect(sanitizeBlogHtml('<a href="JaVaScRiPt:alert(1)">x</a>')).not.toMatch(/javascript:/i)
    expect(sanitizeBlogHtml('<img src="data:image/png;base64,AAAA">')).not.toContain('data:')
  })

  it('removes inline styles and disallowed tags', () => {
    const html = sanitizeBlogHtml('<p style="color:red">Text</p><iframe src="https://x.dev"></iframe><form><input></form>')
    expect(html).toBe('<p>Text</p>')
  })

  it('keeps code block language classes for the highlighter', () => {
    const html = sanitizeBlogHtml('<pre><code class="language-css">.a { color: red; }</code></pre>')
    expect(html).toBe('<pre><code class="language-css">.a { color: red; }</code></pre>')
  })

  it('adds rel and target to external links only', () => {
    expect(sanitizeBlogHtml('<a href="https://colorffy.com">Colorffy</a>')).toBe('<a href="https://colorffy.com" rel="noopener nofollow" target="_blank">Colorffy</a>')
    expect(sanitizeBlogHtml('<a href="https://colorffy.com" rel="noopener noreferrer nofollow">Legacy</a>')).toBe('<a href="https://colorffy.com" rel="noopener nofollow" target="_blank">Legacy</a>')
    expect(sanitizeBlogHtml('<a href="/about">About</a>')).toBe('<a href="/about">About</a>')
    expect(sanitizeBlogHtml('<a href="mailto:hi@colorffy.com">Mail</a>')).toBe('<a href="mailto:hi@colorffy.com">Mail</a>')
  })

  it('always adds img-fluid to images, keeping existing classes', () => {
    expect(sanitizeBlogHtml('<img src="https://x.dev/a.png" alt="A">')).toBe('<img src="https://x.dev/a.png" alt="A" class="img-fluid" />')
    expect(sanitizeBlogHtml('<img src="https://x.dev/a.png" class="rounded img-fluid">')).toBe('<img src="https://x.dev/a.png" class="rounded img-fluid" />')
  })

  it('keeps widget placeholders so they can hydrate', () => {
    const key = 'oklch-vs-oklab'
    const props = { from: '#382bf0', to: '#ffd166', steps: 9, output: 'css' }
    const html = sanitizeBlogHtml(`<div data-blog-widget="${key}" data-props='${JSON.stringify(props)}'></div>`)

    const match = html.match(/data-blog-widget="([^"]+)" data-props="([^"]*)"/)
    expect(match?.[1]).toBe(key)
    expect(JSON.parse(match![2]!.replace(/&quot;/g, '"'))).toEqual(props)
  })

  it('keeps ids on h2/h3 only, so heading anchors survive a second pass', () => {
    expect(sanitizeBlogHtml('<h2 id="a">A</h2><h3 id="b">B</h3><h4 id="c">C</h4><p id="d">D</p>')).toBe('<h2 id="a">A</h2><h3 id="b">B</h3><h4>C</h4><p>D</p>')

    const { html } = addHeadingAnchors(sanitizeBlogHtml('<h2>Getting started</h2><p>Text</p>'))
    expect(sanitizeBlogHtml(html)).toBe('<h2 id="getting-started">Getting started</h2><p>Text</p>')
  })

  it('is stable when run twice', () => {
    const dirty = '<figure src="x"><img src="https://x.dev/a.png"></figure><h2 style="text-align: start">Thanks</h2><a href="https://x.dev">X</a>'
    const once = sanitizeBlogHtml(dirty)
    expect(sanitizeBlogHtml(once)).toBe(once)
  })

  it('returns an empty string for empty input', () => {
    expect(sanitizeBlogHtml('')).toBe('')
  })
})

// Expected outputs were produced by blog-admin's `sanitizePostHtml` (publish-time pass) on the
// same fixtures its `tests/unit/sanitize-post-html.test.ts` uses; the blog must render them unchanged.
describe('parity with blog-admin sanitizePostHtml', () => {
  const fixtures: [string, string][] = [
    [
      '<h2>Intro</h2><p>Some <strong>bold</strong> and <em>italic</em> text.</p>',
      '<h2>Intro</h2><p>Some <strong>bold</strong> and <em>italic</em> text.</p>'
    ],
    [
      '<ul><li>One</li></ul><ol><li>Two</li></ol><blockquote>Quote</blockquote>',
      '<ul><li>One</li></ul><ol><li>Two</li></ol><blockquote>Quote</blockquote>'
    ],
    [
      '<table><thead><tr><th colspan="2">H</th></tr></thead><tbody><tr><td rowspan="2">C</td></tr></tbody></table>',
      '<table><thead><tr><th colspan="2">H</th></tr></thead><tbody><tr><td rowspan="2">C</td></tr></tbody></table>'
    ],
    [
      '<figure><img src="https://x.dev/a.png" width="10" height="10" title="T"><figcaption>Cap</figcaption></figure>',
      '<figure><img src="https://x.dev/a.png" width="10" height="10" title="T" class="img-fluid" /><figcaption>Cap</figcaption></figure>'
    ],
    [
      '<p onmouseover="x()">Hover</p><a href="https://blog.colorffy.com" style="color:red">Link</a><object data="x"></object>',
      '<p>Hover</p><a href="https://blog.colorffy.com" rel="noopener nofollow" target="_blank">Link</a>'
    ]
  ]

  it.each(fixtures)('produces the admin output for %s', (fixture, expected) => {
    expect(sanitizeBlogHtml(fixture)).toBe(expected)
  })
})
