import { sanitizeBlogHtml } from '@giancarlosgza/blog-core/sanitize'
import { describe, expect, it } from 'vitest'
import { addHeadingAnchors } from '#blog/shared/utils/post-headings'

describe('sanitizeBlogHtml with heading anchors', () => {
  it('keeps the anchors on a second pass', () => {
    const { html } = addHeadingAnchors(sanitizeBlogHtml('<h2>Getting started</h2><p>Text</p>'))
    expect(sanitizeBlogHtml(html)).toBe('<h2 id="getting-started">Getting started</h2><p>Text</p>')
  })
})
