/**
 * Represents a range of dates used for filtering or querying data.
 * The date range value can be one of:
 * - 'day': Represents a single day.
 * - '7d': Represents the last 7 days.
 * - '28d': Represents the last 28 days.
 * - '30d': Represents the last 30 days.
 * - '91d': Represents the last 91 days.
 * - 'month': Represents the current month.
 * - '6mo': Represents the last 6 months.
 * - '12mo': Represents the last 12 months.
 * - 'year': Represents the current year.
 * - 'all': Represents all available data.
 */
export type DateRangePeriod = 'day' | '7d' | '28d' | '30d' | '91d' | 'month' | '6mo' | '12mo' | 'year' | 'all'
