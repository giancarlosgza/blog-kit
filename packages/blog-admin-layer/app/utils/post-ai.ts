/** Trims AI string suggestions, drops non-strings and blanks, and caps the list. */
export function normalizeAiSuggestions(raw: unknown, limit: number): string[] {
  if (!Array.isArray(raw))
    return []
  return raw.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, limit)
}

/** Keeps only names from the allowed list (case-insensitive, list markers stripped), in their stored casing. */
export function matchAllowedTags(raw: unknown, allowed: string[], limit: number): string[] {
  if (!Array.isArray(raw))
    return []

  const byLower = new Map(allowed.map(tag => [tag.toLowerCase(), tag]))
  const result = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string')
      continue
    const canonical = byLower.get(item.replace(/^[-*#]\s*/, '').trim().toLowerCase())
    if (canonical)
      result.add(canonical)
  }
  return [...result].slice(0, limit)
}

/** Text mode can still wrap the article in a ```html fence. */
export function stripHtmlFence(text: string): string {
  return text.trim().replace(/^```(?:html)?\s*|\s*```$/g, '').trim()
}

/** Merges tag lists keeping the first occurrence order and no duplicates. */
export function unionTags(current: string[], incoming: string[]): string[] {
  return [...new Set([...current, ...incoming])]
}

/** Trims the AI SEO answer; length limits are only warned about in the editor, never truncated. */
export function normalizeAiSeo(raw: unknown): { seoTitle: string, seoDescription: string } {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const clean = (value: unknown) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  return { seoTitle: clean(data.seoTitle), seoDescription: clean(data.seoDescription) }
}
