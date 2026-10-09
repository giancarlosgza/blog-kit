import { describe, expect, it } from 'vitest'
import { clipText, getInitials, truncateText } from '#admin/app/utils/text'

describe('getInitials', () => {
  it('uses the first and last name', () => {
    expect(getInitials('giancarlos garza')).toBe('GG')
    expect(getInitials('Ana María López')).toBe('AL')
  })

  it('uses one letter for a single name', () => {
    expect(getInitials('Colorffy')).toBe('C')
  })

  it('returns a dash when there is no name', () => {
    expect(getInitials('')).toBe('-')
    expect(getInitials(null)).toBe('-')
    expect(getInitials(undefined)).toBe('-')
  })
})

describe('truncateText', () => {
  it('keeps text within the limit', () => {
    expect(truncateText('Short text', 50)).toBe('Short text')
  })

  it('cuts long text and adds an ellipsis', () => {
    expect(truncateText('abcdefghij', 4)).toBe('abcd...')
  })

  it('returns a dash when empty', () => {
    expect(truncateText('')).toBe('-')
    expect(truncateText(null)).toBe('-')
  })
})

describe('clipText', () => {
  it('keeps text within the limit', () => {
    expect(clipText('Short', 10)).toBe('Short')
  })

  it('clips to the limit with one ellipsis', () => {
    const clipped = clipText('word '.repeat(20), 12)
    expect(clipped.endsWith('…')).toBe(true)
    expect(clipped.length).toBeLessThanOrEqual(12)
  })
})
