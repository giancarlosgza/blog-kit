<script setup lang="ts">
import type { UiAlertToast } from '@colorffy/ui'
import type { Highlighter } from 'shiki'
import { useToast } from '@colorffy/ui'
import { useClipboard } from '@vueuse/core'

/** Interfaces */
interface IBlogCodeBlockProps {
  code?: string | null
  lang?: string | null
}

/** Props */
const props = withDefaults(defineProps<IBlogCodeBlockProps>(), {
  code: null,
  lang: SHIKI_DEFAULT_LANG
})

/** Composables */
const source = ref<string>(props.code || '')
const { copy, copied, isSupported: isClipboardSupported } = useClipboard({ source })
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)
const colorMode = useColorMode()

/** Data */
const highlightedCode = ref<string>('')
const isLoading = ref<boolean>(true)
const highlighter = ref<Highlighter | null>(null)
const isClient = ref(false)

/** Computed */
const resolvedLang = computed(() => resolveShikiLang(props.lang))
const copyButtonAriaLabel = computed(() => `Copy ${resolvedLang.value} code to clipboard`)
const codeBlockAriaLabel = computed(() => `${resolvedLang.value} code example${isLoading.value ? ' - Loading syntax highlighting' : ''}`)
const containerClasses = computed(() => ({
  'code-container': true,
  'code-copied': copied.value,
  'code-loading': isLoading.value
}))

/** Watch */
watch(() => props.code, (newCode) => {
  source.value = newCode || ''
})
watch([source, resolvedLang, () => colorMode.value], () => {
  if (highlighter.value) {
    updateHighlightedCode()
  }
})
watch(copied, (val) => {
  if (val) {
    onToastMessage('success', 'Code copied to clipboard')
  }
})

/** Lifecycle */
onMounted(async () => {
  isClient.value = true
  await initializeHighlighter()
})

/** Methods */
async function initializeHighlighter(): Promise<void> {
  try {
    const { getHighlighter } = useShikiHighlighter()
    highlighter.value = await getHighlighter()

    // Initial highlight
    updateHighlightedCode()
    isLoading.value = false
  } catch (error) {
    console.log('Failed to initialize Shiki highlighter:', error)
    isLoading.value = false
  }
}
function updateHighlightedCode(): void {
  if (source.value && highlighter.value) {
    const isDark = determineTheme()
    highlightedCode.value = highlighter.value.codeToHtml(source.value, {
      lang: resolvedLang.value,
      theme: isDark ? SHIKI_DARK_THEME : SHIKI_LIGHT_THEME
    })
  }
}
function determineTheme(): boolean {
  const htmlElement = document.documentElement

  return colorMode.value === 'dark'
    || htmlElement.classList.contains('dark-mode')
    || (colorMode.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
}
function handleCopyCode(): void {
  if (!isClipboardSupported.value || !source.value)
    return

  copy(source.value)
}
</script>

<template>
  <div>
    <!-- Code block -->
    <div
      :class="containerClasses"
      role="region"
      :aria-label="codeBlockAriaLabel"
    >
      <UiButton
        variant="text"
        icon
        size="sm"
        icon-variant="shape-md"
        :title="copyButtonAriaLabel"
        :aria-label="copyButtonAriaLabel"
        class="position-absolute top-1 right-1 text-neutral"
        :disabled="(!isClient) || !isClipboardSupported || !source"
        @click="handleCopyCode"
      >
        <template #icon>
          <UiIconMaterial
            :icon-code="copied ? '&#xe179;' : '&#xe14f;'"
            :aria-label="copied ? 'Copied' : 'Copy'"
          />
        </template>
      </UiButton>

      <!-- Raw source until Shiki loads -->
      <pre
        v-if="isLoading"
        class="code-loading-placeholder"
        aria-live="polite"
      ><code>{{ source }}</code></pre>
      <div
        v-else
        :aria-label="`Highlighted ${resolvedLang} code`"
        v-html="highlightedCode"
      />
    </div>

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </div>
</template>
