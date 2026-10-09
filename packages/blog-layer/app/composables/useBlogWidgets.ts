import type { WidgetDescriptor } from '@giancarlosgza/blog-core'
import type { Component } from 'vue'

/** An embeddable post widget: its schema (for props coercion) and the component that renders it. */
export interface IBlogWidget {
  descriptor: WidgetDescriptor
  component: Component
}

export type BlogWidgetMap = Record<string, IBlogWidget>

/**
 * Widgets the site registers by providing `$blogWidgets` from a plugin (see `plugins/blog-widgets.ts`).
 * Without one, every `[data-blog-widget]` placeholder renders the "unavailable" fallback.
 */
export function useBlogWidgets(): BlogWidgetMap {
  return (useNuxtApp().$blogWidgets as BlogWidgetMap | undefined) ?? {}
}
