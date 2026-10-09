/**
 * Stats formatting helpers for dashboards.
 * Provides compact number and duration formatting with safe fallbacks.
 */
export function useStatsFormat() {
  /**
   * Formats a number using compact notation (e.g. 1.2K, 3.4M).
   */
  function formatCompactNumber(
    value: number | null | undefined,
    options: { maximumFractionDigits?: number, minimumFractionDigits?: number, fallback?: string } = {}
  ): string {
    const { fallback = '0', maximumFractionDigits = 1, minimumFractionDigits = 0 } = options

    if (value === null || value === undefined) {
      return fallback
    }

    const numberValue = Number(value)

    if (!Number.isFinite(numberValue)) {
      return fallback
    }

    const formatter = new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits,
      minimumFractionDigits: numberValue >= 1000 ? minimumFractionDigits : 0
    })

    return formatter.format(numberValue)
  }

  /**
   * Formats a duration in seconds into a `Xm Ys` string.
   */
  function formatDuration(
    seconds: number | null | undefined,
    options: { fallback?: string } = {}
  ): string {
    const { fallback = '0s' } = options

    if (seconds === null || seconds === undefined) {
      return fallback
    }

    const totalSeconds = Math.max(0, Math.floor(Number(seconds)))

    if (!Number.isFinite(totalSeconds)) {
      return fallback
    }

    if (totalSeconds < 60) {
      return `${totalSeconds}s`
    }

    const minutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = totalSeconds % 60

    if (remainingSeconds === 0) {
      return `${minutes}m`
    }

    return `${minutes}m ${remainingSeconds}s`
  }

  return { formatCompactNumber, formatDuration }
}
