<script setup lang="ts">
import type { ITabItem } from '@colorffy/ui'

/** Interfaces */
interface IColorModeProps {
  showLabels?: boolean
}

/** Props */
const { showLabels = true } = defineProps<IColorModeProps>()

/** Data */
const colorMode = useColorMode()
// Unique tab ids per picker
const idPrefix = useId()
const colorModes = [
  { id: 'system', label: 'System', icon: '&#xe31e;' },
  { id: 'light', label: 'Light', icon: '&#xe518;' },
  { id: 'dark', label: 'Dark', icon: '&#xe51c;' }
]
const colorModeTabs: ITabItem[] = colorModes.map(mode => ({ ...mode, id: `${idPrefix}-${mode.id}` }))

/** Computed */
const activeTab = computed(() => `${idPrefix}-${colorMode.preference}`)

/** Methods */
function selectColorMode(tabId: string): void {
  colorMode.preference = tabId.slice(idPrefix.length + 1)
}
</script>

<template>
  <ClientOnly>
    <UiTabs
      :tabs="colorModeTabs"
      :active-tab="activeTab"
      pill-tabs
      size="sm"
      rounded
      fit
      :icon-only="!showLabels"
      aria-label="Color mode"
      @update:active-tab="selectColorMode"
    />
  </ClientOnly>
</template>
