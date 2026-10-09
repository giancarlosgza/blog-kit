import { describe, expect, it } from 'vitest'
import { htmlToExcerpt, resolveAuthorName, toSlug } from '../src'

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
