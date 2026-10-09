import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { useAdminDateFormat } from '#admin/app/composables/useAdminDateFormat'

const { toDate, formatDate, formatTitleDate } = useAdminDateFormat()
const SAMPLE = new Date('2026-09-22T12:00:00Z')

describe('toDate', () => {
  it('converts Firestore Timestamps', () => {
    expect(toDate(Timestamp.fromDate(SAMPLE))?.getTime()).toBe(SAMPLE.getTime())
  })

  it('accepts Date objects and millisecond numbers', () => {
    expect(toDate(SAMPLE)).toBe(SAMPLE)
    expect(toDate(SAMPLE.getTime())?.getTime()).toBe(SAMPLE.getTime())
  })

  it('returns null for empty or unsupported values', () => {
    expect(toDate(null)).toBeNull()
    expect(toDate(undefined)).toBeNull()
    expect(toDate('2026-09-22')).toBeNull()
  })
})

describe('formatDate', () => {
  it('uses the fallback when there is no date', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate(undefined, 'Never')).toBe('Never')
  })

  it('formats a date as relative time', () => {
    expect(formatDate(new Date())).toBe('just now')
  })
})

describe('formatTitleDate', () => {
  it('formats with the en-US locale by default', () => {
    expect(formatTitleDate(new Date(2026, 8, 22))).toBe('9/22/2026')
  })

  it('returns an empty string when there is no date', () => {
    expect(formatTitleDate(null)).toBe('')
  })
})
