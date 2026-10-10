import { describe, expect, it } from 'vitest'
import { BLOG_LABELS, formatLabel, resolveBlogLabels } from '#blog/shared/utils/blog-labels'

describe('resolveBlogLabels', () => {
  it('picks the dictionary by language', () => {
    expect(resolveBlogLabels('es-MX').latestArticles).toBe('Artículos recientes')
    expect(resolveBlogLabels('es').latestArticles).toBe('Artículos recientes')
    expect(resolveBlogLabels('en-GB').latestArticles).toBe('Latest articles')
  })

  it('falls back to English for unknown or missing locales', () => {
    expect(resolveBlogLabels('fr-FR').latestArticles).toBe('Latest articles')
    expect(resolveBlogLabels(undefined).latestArticles).toBe('Latest articles')
  })

  it('applies site overrides on top', () => {
    expect(resolveBlogLabels('es-MX', { latestArticles: 'Novedades' }).latestArticles).toBe('Novedades')
  })

  it('translates every key', () => {
    expect(Object.keys(BLOG_LABELS.es!).sort()).toEqual(Object.keys(BLOG_LABELS.en!).sort())
  })
})

describe('formatLabel', () => {
  it('fills placeholders and keeps unknown ones', () => {
    expect(formatLabel('Part {part} of {total}', { part: 2, total: 5 })).toBe('Part 2 of 5')
    expect(formatLabel('Hello {name}')).toBe('Hello {name}')
  })
})
