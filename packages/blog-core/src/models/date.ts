export interface ISerializedTimestamp {
  seconds: number
  nanoseconds?: number
}

export interface IDateWithToDate {
  toDate: () => Date
}

/** Firestore `Timestamp`s (client or Admin SDK) match `IDateWithToDate` / `ISerializedTimestamp` structurally. */
export type IFirestoreDateValue = ISerializedTimestamp | IDateWithToDate | number | Date | string | null | undefined
