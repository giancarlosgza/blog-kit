import type { IFirestoreDateValue } from '#blog/shared/models/date'

const MIN_SECONDS_TIMESTAMP = 10000000000

/** Normalize Date, Firestore Timestamp, serialized timestamps, and strings to milliseconds. */
export function useDateValue() {
  function normalizeDateValue(value?: IFirestoreDateValue): number {
    if (!value)
      return 0

    if (value instanceof Date)
      return value.getTime()

    if (typeof value === 'number')
      return value < MIN_SECONDS_TIMESTAMP ? value * 1000 : value

    if (typeof value === 'string') {
      const parsedValue = Date.parse(value)
      return Number.isNaN(parsedValue) ? 0 : parsedValue
    }

    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function')
      return value.toDate().getTime()

    if (typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number')
      return value.seconds * 1000

    return 0
  }

  /** Format a Firestore-ish date value to a human-readable string. */
  function formatDateValue(value?: IFirestoreDateValue, options?: Intl.DateTimeFormatOptions): string {
    const ms = normalizeDateValue(value)
    if (!ms)
      return ''

    return new Date(ms).toLocaleDateString('en-US', options ?? {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return {
    normalizeDateValue,
    formatDateValue
  }
}
