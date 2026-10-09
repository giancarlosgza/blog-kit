import { describe, expect, it } from 'vitest'
import { matchAllowedTags, normalizeAiSeo, normalizeAiSuggestions, stripHtmlFence, unionTags } from '#admin/app/utils/post-ai'

describe('normalizeAiSuggestions', () => {
  it('trims, drops blanks and non-strings, and caps the list', () => {
    expect(normalizeAiSuggestions(['  One ', '', 2, null, 'Two', 'Three'], 2)).toEqual(['One', 'Two'])
  })

  it('returns an empty list for non-array responses', () => {
    expect(normalizeAiSuggestions('One', 5)).toEqual([])
    expect(normalizeAiSuggestions(undefined, 5)).toEqual([])
  })
})

describe('matchAllowedTags', () => {
  const allowed = ['CSS', 'Color Theory', 'Accessibility']

  it('matches case-insensitively and returns the stored casing', () => {
    expect(matchAllowedTags(['css', 'COLOR THEORY'], allowed, 5)).toEqual(['CSS', 'Color Theory'])
  })

  it('strips list markers before matching', () => {
    expect(matchAllowedTags(['- css', '* Accessibility', '# color theory'], allowed, 5)).toEqual(['CSS', 'Accessibility', 'Color Theory'])
  })

  it('drops invented tags, duplicates and non-strings', () => {
    expect(matchAllowedTags(['CSS', 'css', 'Made Up', 42], allowed, 5)).toEqual(['CSS'])
  })

  it('respects the limit', () => {
    expect(matchAllowedTags(['CSS', 'Color Theory', 'Accessibility'], allowed, 2)).toEqual(['CSS', 'Color Theory'])
  })

  it('returns an empty list for non-array responses', () => {
    expect(matchAllowedTags('CSS', allowed, 5)).toEqual([])
  })
})

describe('stripHtmlFence', () => {
  it('removes a ```html fence around the article', () => {
    expect(stripHtmlFence('```html\n<p>Hi</p>\n```')).toBe('<p>Hi</p>')
  })

  it('removes a bare ``` fence', () => {
    expect(stripHtmlFence('```\n<p>Hi</p>\n```')).toBe('<p>Hi</p>')
  })

  it('leaves unfenced HTML untouched apart from trimming', () => {
    expect(stripHtmlFence('  <p>Hi</p>  ')).toBe('<p>Hi</p>')
  })
})

describe('unionTags', () => {
  it('appends new tags without duplicates, keeping order', () => {
    expect(unionTags(['CSS', 'Design'], ['Design', 'Color Theory'])).toEqual(['CSS', 'Design', 'Color Theory'])
  })
})

describe('normalizeAiSeo', () => {
  it('trims and collapses whitespace without truncating long values', () => {
    const long = 'x'.repeat(200)
    expect(normalizeAiSeo({ seoTitle: '  Build\n palettes ', seoDescription: long })).toEqual({ seoTitle: 'Build palettes', seoDescription: long })
  })

  it('returns blanks for missing or non-string fields', () => {
    expect(normalizeAiSeo({ seoTitle: 42 })).toEqual({ seoTitle: '', seoDescription: '' })
    expect(normalizeAiSeo(null)).toEqual({ seoTitle: '', seoDescription: '' })
  })
})
