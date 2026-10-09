import { describe, expect, it } from 'vitest'
import { addHeadingAnchors, estimateReadingTime } from '#blog/shared/utils/post-headings'

describe('addHeadingAnchors', () => {
  it('adds slug ids to h2/h3 and returns the TOC', () => {
    const { html, headings } = addHeadingAnchors('<h2>Getting <strong>started</strong></h2><p>x</p><h3>Why OKLCH?</h3>')
    expect(html).toBe('<h2 id="getting-started">Getting <strong>started</strong></h2><p>x</p><h3 id="why-oklch">Why OKLCH?</h3>')
    expect(headings).toEqual([
      { id: 'getting-started', text: 'Getting started', level: 2 },
      { id: 'why-oklch', text: 'Why OKLCH?', level: 3 }
    ])
  })

  it('dedupes repeated headings with -2, -3', () => {
    const { headings } = addHeadingAnchors('<h2>Thank you</h2><h2>Thank you</h2><h3>Thank you</h3>')
    expect(headings.map(heading => heading.id)).toEqual(['thank-you', 'thank-you-2', 'thank-you-3'])
  })

  it('keeps existing ids and avoids colliding with them', () => {
    const { html, headings } = addHeadingAnchors('<h2 id="custom">Intro</h2><p id="intro">x</p><h2>Intro</h2>')
    expect(html).toBe('<h2 id="custom">Intro</h2><p id="intro">x</p><h2 id="intro-2">Intro</h2>')
    expect(headings.map(heading => heading.id)).toEqual(['custom', 'intro-2'])
  })

  it('decodes entities in the TOC text', () => {
    const { headings } = addHeadingAnchors('<h2>Colors &amp; CSS &#x1F3A8;</h2>')
    expect(headings[0]).toEqual({ id: 'colors-css', text: 'Colors & CSS 🎨', level: 2 })
  })

  it('falls back to a section id when the text has no slug', () => {
    const { headings } = addHeadingAnchors('<h2>🎨</h2><h2>!!!</h2>')
    expect(headings.map(heading => heading.id)).toEqual(['section', 'section-2'])
  })

  it('ignores headings inside pre blocks and widget placeholders', () => {
    const source = '<pre><code><h2>Code</h2></code></pre><div data-blog-widget="oklch-vs-oklab" data-props="{}"><div><h2>Inside</h2></div></div><h2>Outside</h2>'
    const { html, headings } = addHeadingAnchors(source)
    expect(headings).toEqual([{ id: 'outside', text: 'Outside', level: 2 }])
    expect(html).toContain('<h2>Code</h2>')
    expect(html).toContain('<h2>Inside</h2>')
  })

  it('only handles h2 and h3', () => {
    const source = '<h1>Title</h1><h4>Small</h4><h2>Kept</h2>'
    const { html, headings } = addHeadingAnchors(source)
    expect(html).toBe('<h1>Title</h1><h4>Small</h4><h2 id="kept">Kept</h2>')
    expect(headings).toHaveLength(1)
  })

  it('handles empty input', () => {
    expect(addHeadingAnchors('')).toEqual({ html: '', headings: [] })
  })
})

describe('estimateReadingTime', () => {
  const words = (count: number) => `<p>${'word '.repeat(count)}</p>`

  it('returns at least one minute', () => {
    expect(estimateReadingTime('')).toBe(1)
    expect(estimateReadingTime(words(10))).toBe(1)
  })

  it('reads about 225 words per minute', () => {
    expect(estimateReadingTime(words(225))).toBe(1)
    expect(estimateReadingTime(words(450))).toBe(2)
    expect(estimateReadingTime(words(2250))).toBe(10)
  })

  it('counts text only, not markup', () => {
    expect(estimateReadingTime(`<div class="a b c d e f">${'<span>word</span> '.repeat(450)}</div>`)).toBe(2)
  })
})
