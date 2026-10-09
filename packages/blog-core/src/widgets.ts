/**
 * Interactive blog widget contract shared by the blog renderer and the admin editor.
 * Free of Vue/runtime imports; each site maps a widget `key` to its own component.
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
