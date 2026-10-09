/**
 * Represents the statistics for a specific page breakdown.
 */
export interface BreakdownStats {
  /**
   * The name of the page or null if unavailable.
   * @type {string | null}
   */
  page: string | null

  /**
   * The number of visitors to the page or null if unavailable.
   * @type {number | null}
   */
  visitors: number | null
}

/**
 * Represents the response structure for a breakdown query.
 */
export interface BreakdownQueryResponse {
  /**
   * The array of breakdown statistics results.
   * @type {BreakdownStats[]}
   */
  results: BreakdownStats[]
}
