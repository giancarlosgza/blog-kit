import type { Timestamp } from 'firebase/firestore'

export interface ISerializedTimestamp {
  seconds: number
  nanoseconds?: number
}

export interface IDateWithToDate {
  toDate: () => Date
}

export type IFirestoreDateValue = Timestamp | ISerializedTimestamp | IDateWithToDate | number | Date | string | null | undefined
