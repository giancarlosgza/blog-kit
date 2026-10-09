<script setup lang="ts">
import type { App } from 'vue'
import { createApp } from 'vue'
import WidgetError from '#blog/app/widgets/WidgetError.vue'
import BlogCodeBlock from './BlogCodeBlock.vue'

// createApp() hydration below — not multiple SFC components.
/* eslint-disable vue/one-component-per-file */

/**
 * Renders the server-sanitized post body (SSR `v-html`) and, on the client, upgrades
 * `[data-blog-widget]` placeholders and `<pre><code>` blocks into live components.
 * Each is its own app sharing the Nuxt context; torn down on unmount / HTML change.
 */
const props = defineProps<{ html: string }>()

const bodyHtml = computed(() => decorateBlogLinks(props.html))
const root = useTemplateRef<HTMLElement>('root')
const nuxtApp = useNuxtApp()
const widgets = useBlogWidgets()

let mountedApps: App[] = []

function teardown() {
  for (const app of mountedApps) {
    try {
      app.unmount()
    } catch {
      // ignore unmount errors
    }
  }
  mountedApps = []
}

/** Mount a freshly-created app onto `host`, sharing the Nuxt app context. */
function mountInContext(app: App, host: HTMLElement) {
  // Share Nuxt context so the subtree resolves auto-imports / plugins.
  Object.assign(app._context, nuxtApp.vueApp._context)
  app.mount(host)
  mountedApps.push(app)
}

/** Read a `language-xxx` / `lang-xxx` hint from the code or pre element, if any. */
function detectLang(pre: HTMLElement, code: HTMLElement | null): string | null {
  const classes = `${code?.className || ''} ${pre.className || ''}`
  return classes.match(/(?:language|lang)-([\w#+-]+)/i)?.[1] ?? null
}

/** Upgrade `<pre><code>` blocks into theme-aware Shiki code blocks with a copy button. */
function hydrateCodeBlocks() {
  if (!root.value)
    return

  const blocks = root.value.querySelectorAll<HTMLElement>('pre')
  blocks.forEach((pre) => {
    // Skip code inside a widget subtree.
    if (pre.closest('[data-blog-widget]'))
      return

    const code = pre.querySelector<HTMLElement>(':scope > code')
    const source = (code ?? pre).textContent ?? ''
    if (!source.trim())
      return

    const host = document.createElement('div')
    host.className = 'blog-code-host'
    pre.replaceWith(host)

    mountInContext(createApp(BlogCodeBlock, { code: source, lang: detectLang(pre, code) }), host)
  })
}

function hydrateWidgets() {
  if (!root.value)
    return

  const placeholders = root.value.querySelectorAll<HTMLElement>('[data-blog-widget]')
  placeholders.forEach((el) => {
    const key = el.dataset.blogWidget || ''
    const widget = widgets[key]

    let app: App
    if (!widget) {
      app = createApp(WidgetError, { reason: `Unknown widget “${key}”` })
    } else {
      const { props: widgetProps } = coerceProps(safeParseProps(el.dataset.props), widget.descriptor)
      if (widget.descriptor.minHeight)
        el.style.minHeight = `${widget.descriptor.minHeight}px`
      app = createApp(widget.component, widgetProps)
    }

    el.innerHTML = ''
    mountInContext(app, el)
  })
}

function hydrate() {
  teardown()
  hydrateCodeBlocks()
  hydrateWidgets()
}

onMounted(hydrate)
onBeforeUnmount(teardown)
watch(() => props.html, async () => {
  await nextTick()
  hydrate()
})
</script>

<template>
  <div
    ref="root"
    class="blog-prose"
    v-html="bodyHtml"
  />
</template>
