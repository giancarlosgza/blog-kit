import { formatTimeAgo } from '@vueuse/core'

/**
 * Date formatting helpers for admin UI
 * - formatDate: human-friendly "time ago" with fallback
 * - formatTitleDate: locale date string for title tooltips
 * - formatDateTime: locale date + time (scheduled publish times)
 */
export function useDateFormat() {
  /**
   * Converts Firestore Timestamp to Date if needed
   */
  function toDate(date: any): Date | null {
    if (!date) {
      return null
    }
    // Firestore Timestamp has toDate() method
    if (typeof date.toDate === 'function') {
      return date.toDate()
    }
    // Already a Date
    if (date instanceof Date) {
      return date
    }
    // Number (milliseconds)
    if (typeof date === 'number') {
      return new Date(date)
    }
    return null
  }

  /**
   * Returns a human-friendly relative time string or fallback
   */
  function formatDate(date: any, fallback = '-'): string {
    const convertedDate = toDate(date)
    if (!convertedDate) {
      return fallback
    }
    return formatTimeAgo(convertedDate)
  }

  /**
   * Returns a localized date string for titles/tooltips
   */
  function formatTitleDate(date: any, locale = 'en-US'): string {
    const convertedDate = toDate(date)
    if (!convertedDate) {
      return ''
    }
    return convertedDate.toLocaleDateString(locale)
  }

  /**
   * Returns a localized date and time, e.g. "Sep 24, 2026, 10:00 AM"
   */
  function formatDateTime(date: any, locale = 'en-US'): string {
    const convertedDate = toDate(date)
    if (!convertedDate) {
      return ''
    }
    return convertedDate.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
  }

  return {
    toDate,
    formatDate,
    formatTitleDate,
    formatDateTime
  }
}
