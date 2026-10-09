/**
 * Represents a single row returned in the results list of a Plausible API v2 query.
 */
export interface V2QueryResultRow {
  /**
   * The list of values corresponding to the dimensions requested in the query.
   * @type {string[]}
   */
  dimensions: string[]

  /**
   * The list of numeric values corresponding to the metrics requested in the query.
   * @type {number[]}
   */
  metrics: number[]
}

/**
 * Represents the response structure returned by the Plausible Stats API v2 query endpoint.
 */
export interface V2QueryResponse {
  /**
   * The array ofQueryResultRow statistics results.
   * @type {V2QueryResultRow[]}
   */
  results: V2QueryResultRow[]

  /**
   * The query parameters that were parsed and executed.
   */
  query: {
    /**
     * The site ID / domain being queried.
     * @type {string}
     */
    site_id: string

    /**
     * The list of metrics requested in the query.
     * @type {string[]}
     */
    metrics: string[]

    /**
     * The resolved start and end date-times for the query.
     * @type {[string, string]}
     */
    date_range: [string, string]
  }
}

/**
 * Represents the response structure returned by Plausible aggregate queries under the v2 query endpoint.
 */
export interface V2AggregateResponse {
  /**
   * The array ofQueryResultRow containing aggregate statistics results.
   * @type {V2QueryResultRow[]}
   */
  results: V2QueryResultRow[]

  /**
   * The query parameters that were parsed and executed.
   */
  query: {
    /**
     * The site ID / domain being queried.
     * @type {string}
     */
    site_id: string

    /**
     * The list of metrics requested in the query.
     * @type {string[]}
     */
    metrics: string[]

    /**
     * The resolved start and end date-times for the query.
     * @type {[string, string]}
     */
    date_range: [string, string]
  }
}
