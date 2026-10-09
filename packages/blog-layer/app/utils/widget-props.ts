import type { WidgetDescriptor } from '#blog/shared/widgets/types'

/** Safely parse a widget's `data-props` JSON into a plain object. Never throws. */
export function safeParseProps(raw: string | null | undefined): Record<string, unknown> {
  if (!raw)
    return {}

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function clamp(value: number, min?: number, max?: number): number {
  let result = value
  if (typeof min === 'number')
    result = Math.max(min, result)
  if (typeof max === 'number')
    result = Math.min(max, result)
  return result
}

/**
 * Coerce raw (untrusted) props against a widget descriptor's schema.
 * Always returns a fully-populated, type-correct props object: invalid or missing
 * values fall back to the schema default, numbers are clamped, enums validated.
 */
export function coerceProps(
  raw: Record<string, unknown>,
  descriptor: WidgetDescriptor
): { props: Record<string, unknown> } {
  const props: Record<string, unknown> = {}

  for (const [key, schema] of Object.entries(descriptor.props)) {
    const value = raw[key]

    switch (schema.type) {
      case 'number': {
        const num = typeof value === 'number' ? value : Number(value)
        props[key] = Number.isFinite(num) ? clamp(num, schema.min, schema.max) : schema.default
        break
      }
      case 'boolean': {
        props[key] = typeof value === 'boolean' ? value : Boolean(schema.default)
        break
      }
      case 'enum': {
        const allowed = (schema.options ?? []).map(option => option.value)
        props[key] = typeof value === 'string' && allowed.includes(value) ? value : schema.default
        break
      }
      case 'color':
      case 'string':
      default: {
        props[key] = typeof value === 'string' && value.trim() ? value : schema.default
        break
      }
    }
  }

  return { props }
}
