/**
 * Represents a statistical value with a numeric value or null.
 */
interface StatValue {
  /**
   * The numeric value of the statistic, or null if unavailable.
   * @type {number | null}
   */
  value: number | null

  /**
   * The percentage change compared to the previous period, if available.
   * @type {number | null}
   */
  change: number | null
}

/**
 * Represents the aggregate statistics for a specific query.
 */
export interface AggregateStats {
  /**
   * Bounce rate percentage.
   * @type {StatValue}
   */
  bounce_rate: StatValue

  /**
   * The number of pageview events.
   * @type {StatValue}
   */
  pageviews: StatValue

  /**
   * Visit duration in seconds.
   * @type {StatValue}
   */
  visit_duration: StatValue

  /**
   * The number of unique visitors.
   * @type {StatValue}
   */
  visitors: StatValue

  /**
   * The number of visits/sessions.
   * @type {StatValue}
   */
  visits: StatValue
}

/**
 * Represents the response structure for an aggregate query.
 */
export interface AggregateQueryResponse {
  /**
   * The results of the aggregate query, containing aggregate statistics.
   * @type {AggregateStats}
   */
  results: AggregateStats
}
