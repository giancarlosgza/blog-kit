import type { IFirestoreDateValue } from '#blog/shared/models/date'
import { toDateMs } from '#blog/shared/utils/date'

/** Normalize Date, Firestore Timestamp, serialized timestamps, and strings to milliseconds. */
export function useDateValue() {
  function normalizeDateValue(value?: IFirestoreDateValue): number {
    return toDateMs(value) ?? 0
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
