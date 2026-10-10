import { Timestamp } from 'firebase-admin/firestore'
import { describe, expect, it, vi } from 'vitest'
import { useDateValue } from '#blog/app/composables/useDateValue'

const appConfig = { blog: { locale: 'en-US' } }
vi.stubGlobal('useAppConfig', () => appConfig)

const { normalizeDateValue, formatDateValue } = useDateValue()
const MS = Date.UTC(2026, 8, 22, 12, 0, 0)

describe('normalizeDateValue', () => {
  it('returns 0 for empty values', () => {
    expect(normalizeDateValue(undefined)).toBe(0)
    expect(normalizeDateValue(null)).toBe(0)
    expect(normalizeDateValue(0)).toBe(0)
    expect(normalizeDateValue('')).toBe(0)
  })

  it('reads Date instances', () => {
    expect(normalizeDateValue(new Date(MS))).toBe(MS)
  })

  it('reads Firestore Timestamps and toDate-like objects', () => {
    expect(normalizeDateValue(Timestamp.fromMillis(MS))).toBe(MS)
    expect(normalizeDateValue({ toDate: () => new Date(MS) })).toBe(MS)
  })

  it('reads serialized { seconds } timestamps', () => {
    expect(normalizeDateValue({ seconds: MS / 1000, nanoseconds: 0 })).toBe(MS)
    expect(normalizeDateValue({ seconds: MS / 1000 })).toBe(MS)
  })

  it('treats small numbers as seconds and large numbers as milliseconds', () => {
    expect(normalizeDateValue(MS / 1000)).toBe(MS)
    expect(normalizeDateValue(MS)).toBe(MS)
    expect(normalizeDateValue(9999999999)).toBe(9999999999000)
    expect(normalizeDateValue(10000000000)).toBe(10000000000)
  })

  it('parses date strings', () => {
    expect(normalizeDateValue('2026-09-22T12:00:00.000Z')).toBe(MS)
  })

  it('returns 0 for invalid values', () => {
    expect(normalizeDateValue('not a date')).toBe(0)
    expect(normalizeDateValue({ seconds: '1' } as never)).toBe(0)
    expect(normalizeDateValue({} as never)).toBe(0)
  })
})

describe('formatDateValue', () => {
  it('formats a long en-US date and returns an empty string for empty values', () => {
    expect(formatDateValue(MS, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })).toBe('September 22, 2026')
    expect(formatDateValue(undefined)).toBe('')
    expect(formatDateValue('nope')).toBe('')
  })

  it('formats in the blog locale', () => {
    appConfig.blog.locale = 'es-MX'
    expect(useDateValue().formatDateValue(MS, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })).toBe('22 de septiembre de 2026')
    appConfig.blog.locale = 'en-US'
  })
})
