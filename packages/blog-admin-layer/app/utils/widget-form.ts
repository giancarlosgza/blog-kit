import type { WidgetDescriptor, WidgetPropSchema } from '@giancarlosgza/blog-core'

export interface IWidgetPreview {
  label: string
  swatches: string[]
  gradient?: string
  sample?: { color: string, background: string }
}

const HEX_PATTERN = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/** Expand #rgb/#rgba/#rrggbbaa to the opaque #rrggbb `<input type="color">` requires; `null` otherwise. */
export function toPickerHex(value: unknown): string | null {
  if (typeof value !== 'string')
    return null

  const hex = value.trim().toLowerCase()
  if (!HEX_PATTERN.test(hex))
    return null

  const digits = hex.slice(1)
  if (digits.length <= 4)
    return `#${digits.slice(0, 3).split('').map(digit => digit + digit).join('')}`
  return `#${digits.slice(0, 6)}`
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(channel => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0')).join('')}`
}

/** Hint shown under number inputs so the bounds are visible, not only enforced. */
export function numberRangeHint(schema: WidgetPropSchema): string | null {
  const hasMin = typeof schema.min === 'number'
  const hasMax = typeof schema.max === 'number'
  if (hasMin && hasMax)
    return `Between ${schema.min} and ${schema.max}.`
  if (hasMin)
    return `At least ${schema.min}.`
  if (hasMax)
    return `At most ${schema.max}.`
  return null
}

/**
 * Normalize the dialog form against the schema before it is embedded: numbers clamped,
 * enums/booleans validated, strings trimmed. Required blanks fall back to the default,
 * optional ones stay empty. Mirrors the blog's coerceProps so stored HTML is already clean.
 */
export function normalizeWidgetProps(descriptor: WidgetDescriptor, form: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = {}

  for (const [key, schema] of Object.entries(descriptor.props)) {
    const value = form[key]

    switch (schema.type) {
      case 'number': {
        const num = typeof value === 'number' ? value : Number(value)
        if (value === '' || value === null || !Number.isFinite(num)) {
          props[key] = schema.default
          break
        }
        let clamped = num
        if (typeof schema.min === 'number')
          clamped = Math.max(schema.min, clamped)
        if (typeof schema.max === 'number')
          clamped = Math.min(schema.max, clamped)
        props[key] = clamped
        break
      }
      case 'boolean':
        props[key] = typeof value === 'boolean' ? value : Boolean(schema.default)
        break
      case 'enum': {
        const allowed = (schema.options ?? []).map(option => option.value)
        props[key] = typeof value === 'string' && allowed.includes(value) ? value : schema.default
        break
      }
      default: {
        const text = typeof value === 'string' ? value.trim() : ''
        props[key] = text || (schema.required ? schema.default : '')
      }
    }
  }

  return props
}
