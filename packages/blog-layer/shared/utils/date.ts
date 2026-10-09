import type { IFirestoreDateValue } from '../models/date'

/** Below this, a number is Unix seconds rather than milliseconds. */
const MIN_SECONDS_TIMESTAMP = 10_000_000_000

/** Firestore-ish date value (Date, Timestamp, `{ seconds }`, seconds/ms number, ISO string) → Unix ms, or `null`. */
export function toDateMs(value: IFirestoreDateValue): number | null {
  if (value == null || value === '')
    return null

  let ms: number
  if (value instanceof Date)
    ms = value.getTime()
  else if (typeof value === 'number')
    ms = value < MIN_SECONDS_TIMESTAMP ? value * 1000 : value
  else if (typeof value === 'string')
    ms = Date.parse(value)
  else if ('toDate' in value && typeof value.toDate === 'function')
    ms = value.toDate().getTime()
  else if ('seconds' in value && typeof value.seconds === 'number')
    ms = value.seconds * 1000
  else
    return null

  return Number.isFinite(ms) && ms > 0 ? ms : null
}
