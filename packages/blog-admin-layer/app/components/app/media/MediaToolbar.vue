<script setup lang="ts">
import type { IChipOption } from '@colorffy/ui'
import type { MediaSort, MediaUsageFilter, MediaView } from '#admin/app/utils/media-filters'
import { breakpointsBootstrapV5, useBreakpoints, useMounted, watchDebounced } from '@vueuse/core'
import { DEFAULT_MEDIA_SORT, DEFAULT_MEDIA_VIEW, MEDIA_SORT_OPTIONS } from '#admin/app/utils/media-filters'

/** Interfaces */
interface IMediaToolbarProps {
  usedCount?: number
  unusedCount?: number
  hasFilterActive?: boolean
}
interface IMediaToolbarEmits {
  clearAll: []
}

/** Props */
const props = withDefaults(defineProps<IMediaToolbarProps>(), {
  usedCount: 0,
  unusedCount: 0,
  hasFilterActive: false
})

/** Emit */
const emit = defineEmits<IMediaToolbarEmits>()

/** Models */
const searchQueryKeyword = defineModel<string | null>('searchQueryKeyword', { default: null })
const usageQueryKeyword = defineModel<MediaUsageFilter | null>('usageQueryKeyword', { default: null })
const sortByQueryKeyword = defineModel<MediaSort>('sortByQueryKeyword', { default: DEFAULT_MEDIA_SORT })
const viewQueryKeyword = defineModel<MediaView>('viewQueryKeyword', { default: DEFAULT_MEDIA_VIEW })

/** Breakpoints */
const breakpoints = useBreakpoints(breakpointsBootstrapV5)
const isMounted = useMounted()
const isSmallScreen = breakpoints.smallerOrEqual('sm')
const isMobile = computed<boolean>(() => isMounted.value && isSmallScreen.value)

/** Data */
const localSearchQuery = ref<string | null>(searchQueryKeyword.value)
let lastCommittedSearch = searchQueryKeyword.value

/** Computed */
const usageOptions = computed<IChipOption[]>(() => [
  { id: 'all', text: 'All' },
  { id: 'used', text: `Used ${props.usedCount}` },
  { id: 'unused', text: `Unused ${props.unusedCount}` }
])
const sortLabel = computed<string>(() => MEDIA_SORT_OPTIONS.find(option => option.value === sortByQueryKeyword.value)?.label ?? 'Sort')
const isSortActive = computed<boolean>(() => sortByQueryKeyword.value !== DEFAULT_MEDIA_SORT)

/** Watch */
watch(searchQueryKeyword, (searchVal) => {
  if (searchVal === lastCommittedSearch)
    return
  lastCommittedSearch = searchVal
  localSearchQuery.value = searchVal
})
watchDebounced(localSearchQuery, commitSearch, { debounce: 250 })

/** Methods */
function commitSearch(): void {
  const next = localSearchQuery.value?.trim() || null
  if (next === searchQueryKeyword.value)
    return
  lastCommittedSearch = next
  searchQueryKeyword.value = next
}
function selectUsage(value: string | string[] | null): void {
  const next = Array.isArray(value) ? value[0] : value
  usageQueryKeyword.value = next === 'used' || next === 'unused' ? next : null
}
</script>

<template>
  <div class="media-toolbar">
    <div class="media-toolbar-filters">
      <UiInputText
        id="media-search-input"
        v-model="localSearchQuery"
        label="Search files"
        placeholder="Search files"
        size="sm"
        type="search"
        hide-label
        aria-label="Search files by name or path"
        class="media-toolbar-search"
        @keyup.enter="commitSearch"
      />
      <UiChipGroup
        :options="usageOptions"
        :model-value="usageQueryKeyword ?? 'all'"
        variant="outline"
        color="secondary"
        aria-label="Filter by usage"
        @update:model-value="selectUsage"
      />
      <UiButtonTooltip
        v-if="props.hasFilterActive"
        variant="text"
        icon
        custom-class="text-neutral"
        size="sm"
        tooltip-text="Clear filters"
        aria-label="Clear filters"
        @click="emit('clearAll')"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5cd;" />
        </template>
      </UiButtonTooltip>
    </div>

    <div class="media-toolbar-actions">
      <UiButtonMenu
        id="media-sort"
        :variant="isSortActive ? 'tonal' : 'outline'"
        :color="isSortActive ? 'secondary' : undefined"
        :text="sortLabel"
        :is-mobile="isMobile"
        size="sm"
        tooltip-text="Sort by"
        icon-trailing
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5cf;" />
        </template>
        <template #menu>
          <UiButtonMenuItem
            v-for="sort in MEDIA_SORT_OPTIONS"
            :key="`sort-${sort.value}`"
            :icon="sortByQueryKeyword === sort.value ? '&#xe876;' : '&#xe8d5;'"
            :item-text="sort.label"
            :custom-class="sortByQueryKeyword === sort.value ? 'active' : ''"
            @click="sortByQueryKeyword = sort.value"
          />
        </template>
      </UiButtonMenu>
      <AppViewToggle v-model:view="viewQueryKeyword" />
    </div>
  </div>
</template>
