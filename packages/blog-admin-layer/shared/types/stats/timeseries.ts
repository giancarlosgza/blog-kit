/**
 * Interface representing the statistics for a specific time series.
 */
export interface TimeseriesStats {
  /**
   * The date associated with the statistics.
   * @type {string | null | undefined}
   */
  date?: string | null

  /**
   * The number of visitors for the given date.
   * @type {number | null | undefined}
   */
  visitors?: number | null
}

/**
 * Interface representing the response structure for a time series query.
 */
export interface TimeseriesQueryResponse {
  /**
   * The array of time series statistics results.
   * @type {TimeseriesStats[]}
   */
  results: TimeseriesStats[]
}
