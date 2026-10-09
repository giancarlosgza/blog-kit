/**
 * Interactive blog widget contract.
 *
 * This file is the single source of truth for widget metadata and is DUPLICATED
 * byte-identically into blog-admin/shared/widgets/ (two independent repos). Keep it
 * free of Vue/runtime imports so both the public renderer and the admin editor can
 * consume it. The public site maps each `key` to an actual Vue component separately
 * (app/widgets/component-map.ts).
 */
export type WidgetPropType = 'string' | 'number' | 'boolean' | 'color' | 'enum'

export interface WidgetPropOption {
  value: string
  label: string
}

export interface WidgetPropSchema {
  type: WidgetPropType
  label: string
  default: string | number | boolean
  required?: boolean
  help?: string
  /** enum only */
  options?: WidgetPropOption[]
  /** number only */
  min?: number
  max?: number
  step?: number
}

export interface WidgetDescriptor {
  /** Stored verbatim in the `data-blog-widget` attribute. */
  key: string
  name: string
  description: string
  /** Material Symbols HTML entity code point, e.g. `&#xe3e9;` (optional). */
  icon?: string
  /** px reserved by the placeholder before hydration, to avoid layout shift. */
  minHeight?: number
  props: Record<string, WidgetPropSchema>
}
