/** Two-letter initials (first + last name) for avatars; `-` when there is no name. */
export function getInitials(name: string | undefined | null): string {
  if (!name) {
    return '-'
  }
  const nameParts = name.split(' ')
  const first = nameParts[0] ?? ''
  const last = nameParts.length > 1 ? nameParts.at(-1) ?? '' : ''
  const firstInitial = first.charAt(0).toUpperCase()
  const lastInitial = last.charAt(0).toUpperCase()
  const initials = `${firstInitial}${lastInitial}`.trim()
  return initials || firstInitial || '-'
}

/** Truncates text to `maxLength` characters with a trailing ellipsis; `-` when empty. */
export function truncateText(text?: string | null, maxLength: number = 50): string {
  if (!text) {
    return '-'
  }
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
}

/** Clips text to `maxLength` characters with a single ellipsis, like search result snippets. */
export function clipText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text
}
