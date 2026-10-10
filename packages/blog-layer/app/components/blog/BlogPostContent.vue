<script setup lang="ts">
import type { App } from 'vue'
import { createApp } from 'vue'
import WidgetError from '#blog/app/widgets/WidgetError.vue'
import BlogCodeBlock from './BlogCodeBlock.vue'

/* eslint-disable vue/one-component-per-file -- createApp() hydration, not extra SFCs */

/** Props */
const props = defineProps<{ html: string }>()

const bodyHtml = computed(() => decorateBlogLinks(props.html))
const root = useTemplateRef<HTMLElement>('root')
const nuxtApp = useNuxtApp()
const widgets = useBlogWidgets()
const { t } = useBlogLabels()

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

/** Mounts an app on `host` with the Nuxt context */
function mountInContext(app: App, host: HTMLElement) {
  Object.assign(app._context, nuxtApp.vueApp._context)
  app.mount(host)
  mountedApps.push(app)
}

/** Language hint from `language-xxx` / `lang-xxx` classes */
function detectLang(pre: HTMLElement, code: HTMLElement | null): string | null {
  const classes = `${code?.className || ''} ${pre.className || ''}`
  return classes.match(/(?:language|lang)-([\w#+-]+)/i)?.[1] ?? null
}

/** Upgrades `<pre><code>` blocks into Shiki code blocks */
function hydrateCodeBlocks() {
  if (!root.value)
    return

  const blocks = root.value.querySelectorAll<HTMLElement>('pre')
  blocks.forEach((pre) => {
    // Widgets render their own code
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
    const widget = Object.hasOwn(widgets, key) ? widgets[key] : undefined

    let app: App
    if (!widget) {
      app = createApp(WidgetError, { title: t('widgetUnavailable'), reason: t('unknownWidget', { key }) })
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
