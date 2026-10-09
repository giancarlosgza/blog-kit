import { describe, expect, it } from 'vitest'
import { decorateBlogLinks, htmlToExcerpt, resolveAuthorName, toSlug } from '#blog/shared/utils/blog'

describe('toSlug', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(toSlug('Accessible Color Palettes')).toBe('accessible-color-palettes')
  })

  it('drops punctuation and collapses separators', () => {
    expect(toSlug('  OKLCH vs. OKLab: what\'s new?  ')).toBe('oklch-vs-oklab-whats-new')
    expect(toSlug('css__tips -- 2026')).toBe('css-tips-2026')
  })

  it('trims leading and trailing hyphens', () => {
    expect(toSlug('--Hello World--')).toBe('hello-world')
  })

  it('returns an empty string when nothing is left', () => {
    expect(toSlug('!!!')).toBe('')
    expect(toSlug('🎨')).toBe('')
  })
})

describe('resolveAuthorName', () => {
  it('prefers the new authorName field', () => {
    expect(resolveAuthorName({ authorName: 'Giancarlos', author: 'Legacy' })).toBe('Giancarlos')
  })

  it('falls back to the legacy author field, then to the given fallback', () => {
    expect(resolveAuthorName({ author: 'Legacy' }, 'Brand')).toBe('Legacy')
    expect(resolveAuthorName({ authorName: '', author: '' }, 'Brand')).toBe('Brand')
    expect(resolveAuthorName({})).toBe('')
  })
})

describe('decorateBlogLinks', () => {
  it('adds text-link to links without a class', () => {
    expect(decorateBlogLinks('<a href="/about">About</a>')).toBe('<a class="text-link" href="/about">About</a>')
  })

  it('merges text-link into existing classes', () => {
    expect(decorateBlogLinks('<a class="fw-600" href="/x">X</a>')).toBe('<a class="fw-600 text-link" href="/x">X</a>')
    expect(decorateBlogLinks('<a href=\'/x\' class=\'a b\'>X</a>')).toBe('<a href=\'/x\' class=\'a b text-link\'>X</a>')
  })

  it('is idempotent', () => {
    const once = decorateBlogLinks('<p><a href="https://colorffy.com" rel="noopener nofollow" target="_blank">A</a> <a class="x" href="/b">B</a></p>')
    expect(decorateBlogLinks(once)).toBe(once)
    expect(once.match(/text-link/g)).toHaveLength(2)
  })

  it('leaves other tags alone and handles empty input', () => {
    expect(decorateBlogLinks('<abbr title="t">T</abbr><article>x</article>')).toBe('<abbr title="t">T</abbr><article>x</article>')
    expect(decorateBlogLinks('')).toBe('')
  })
})

describe('htmlToExcerpt', () => {
  it('strips tags and collapses whitespace', () => {
    expect(htmlToExcerpt('<h2>Title</h2>\n<p>Some <strong>bold</strong>   text.</p>')).toBe('Title Some bold text.')
  })

  it('keeps short text as-is', () => {
    expect(htmlToExcerpt('<p>Short</p>', 10)).toBe('Short')
  })

  it('truncates long text with an ellipsis within the limit', () => {
    const excerpt = htmlToExcerpt(`<p>${'word '.repeat(50)}</p>`, 20)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBeLessThanOrEqual(20)
  })

  it('defaults to 160 characters', () => {
    expect(htmlToExcerpt(`<p>${'a'.repeat(400)}</p>`)).toHaveLength(160)
  })

  it('handles empty input', () => {
    expect(htmlToExcerpt('')).toBe('')
  })
})
