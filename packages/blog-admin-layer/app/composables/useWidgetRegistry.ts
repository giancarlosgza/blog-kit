import type { WidgetDescriptor } from '@giancarlosgza/blog-core'
import type { IWidgetPreview } from '#admin/app/utils/widget-form'

/** Widgets editors can embed, provided by the site as `$blogWidgetRegistry` from a plugin. */
export interface IWidgetRegistry {
  descriptors: Record<string, WidgetDescriptor>
  /** Editor summary (label + swatches) for a widget's props; defaults to the widget name. */
  preview?: (key: string, props: Record<string, unknown>) => IWidgetPreview | null
}

/**
 * The site's widget registry. Without a `$blogWidgetRegistry` plugin the editor hides
 * "Insert widget" and existing placeholders show as unknown widgets.
 */
export function useWidgetRegistry() {
  const registry = useNuxtApp().$blogWidgetRegistry as IWidgetRegistry | undefined
  const descriptors = registry?.descriptors ?? {}
  const keys = Object.keys(descriptors)

  function getDescriptor(key: string): WidgetDescriptor | undefined {
    return Object.hasOwn(descriptors, key) ? descriptors[key] : undefined
  }

  function preview(key: string, props: Record<string, unknown>): IWidgetPreview | null {
    const descriptor = getDescriptor(key)
    if (!descriptor)
      return null
    return registry?.preview?.(key, props) ?? { label: descriptor.name, swatches: [] }
  }

  return { descriptors, keys, getDescriptor, preview }
}
