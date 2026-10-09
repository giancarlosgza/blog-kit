<script setup lang="ts">
import type { IAuthor, ITag } from '@giancarlosgza/blog-core'
import type { PostSort, PostStatusFilter } from '#admin/app/utils/post-filters'
import { breakpointsBootstrapV5, useBreakpoints, useMounted, watchDebounced } from '@vueuse/core'
import { authorKey, DEFAULT_POST_SORT, POST_SORT_OPTIONS, POST_STATUS_OPTIONS } from '#admin/app/utils/post-filters'

/** Interfaces */
interface IPostsFiltersProps {
  authors?: IAuthor[] | null
  tags?: ITag[] | null
  hasFilterActive?: boolean
}
interface IPostsFiltersEmits {
  openFiltersDialog: []
  clearAll: []
}

/** Props */
const props = withDefaults(defineProps<IPostsFiltersProps>(), {
  authors: null,
  tags: null,
  hasFilterActive: false
})

/** Emit */
const emit = defineEmits<IPostsFiltersEmits>()

/** Models */
const searchQueryKeyword = defineModel<string | null>('searchQueryKeyword', { default: null })
const statusQueryKeyword = defineModel<PostStatusFilter | null>('statusQueryKeyword', { default: null })
const authorQueryKeyword = defineModel<string | null>('authorQueryKeyword', { default: null })
const tagQueryKeyword = defineModel<string | null>('tagQueryKeyword', { default: null })
const sortByQueryKeyword = defineModel<PostSort>('sortByQueryKeyword', { default: DEFAULT_POST_SORT })

/** Breakpoints */
const breakpoints = useBreakpoints(breakpointsBootstrapV5)
const isMounted = useMounted()
const isSmallScreen = breakpoints.smallerOrEqual('sm')
const isMobile = computed<boolean>(() => isMounted.value && isSmallScreen.value)

/** Data */
const localSearchQuery = ref<string | null>(searchQueryKeyword.value)
let lastCommittedSearch = searchQueryKeyword.value

/** Computed */
const isSearchActive = computed<boolean>(() => Boolean(searchQueryKeyword.value))
const statusLabel = computed<string>(() => POST_STATUS_OPTIONS.find(option => option.value === statusQueryKeyword.value)?.label ?? 'Status')
const selectedAuthor = computed<IAuthor | null>(() => props.authors?.find(author => authorKey(author) === authorQueryKeyword.value) ?? null)
const authorLabel = computed<string>(() => selectedAuthor.value?.name ?? authorQueryKeyword.value ?? 'Author')
const tagLabel = computed<string>(() => tagQueryKeyword.value ?? 'Tag')
const sortLabel = computed<string>(() => POST_SORT_OPTIONS.find(option => option.value === sortByQueryKeyword.value)?.label ?? 'Sort')
const isSortActive = computed<boolean>(() => sortByQueryKeyword.value !== DEFAULT_POST_SORT)

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
function toggleStatus(status: PostStatusFilter | null): void {
  statusQueryKeyword.value = statusQueryKeyword.value === status ? null : status
}
function toggleAuthor(author: IAuthor | null): void {
  const key = author ? authorKey(author) : null
  authorQueryKeyword.value = authorQueryKeyword.value === key ? null : key
}
function toggleTag(tag: string | null): void {
  tagQueryKeyword.value = tagQueryKeyword.value === tag ? null : tag
}
</script>

<template>
  <div class="filter-container">
    <div class="filter-layout">
      <!-- Search bar -->
      <div class="filter-search beam-sweep">
        <UiInputText
          id="posts-search-input"
          v-model="localSearchQuery"
          label="Search posts"
          placeholder="Search by title, slug or excerpt"
          size="sm"
          type="search"
          hide-label
          aria-label="Search posts by title, slug or excerpt"
          @keyup.enter="commitSearch"
        />
        <UiButtonTooltip
          tooltip-text="Search"
          :variant="isSearchActive ? 'tonal' : 'outline'"
          :color="isSearchActive ? 'secondary' : undefined"
          icon
          size="sm"
          aria-label="Search posts"
          @click="commitSearch"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe8b6;" />
          </template>
        </UiButtonTooltip>
        <UiDivider
          vertical
          custom-class="toolbar-divider"
        />
      </div>

      <!-- Filters -->
      <div class="filter-content">
        <UiButtonTooltip
          variant="outline"
          icon
          size="sm"
          tooltip-text="Filters"
          aria-label="Open filters"
          @click="emit('openFiltersDialog')"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xf614;" />
          </template>
        </UiButtonTooltip>

        <!-- Chips -->
        <div class="filter-chips">
          <UiButtonGroup connected>
            <!-- Status -->
            <UiButtonMenu
              id="posts-filter-status"
              :variant="statusQueryKeyword ? 'tonal' : 'outline'"
              :color="statusQueryKeyword ? 'secondary' : undefined"
              :text="statusLabel"
              :is-mobile="isMobile"
              size="sm"
              tooltip-text="Post status"
              icon-trailing
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5cf;" />
              </template>
              <template #menu>
                <UiButtonMenuItem
                  :icon="statusQueryKeyword ? '&#xe0b8;' : '&#xeb57;'"
                  :item-text="statusQueryKeyword ? 'Clear status' : 'All'"
                  :custom-class="statusQueryKeyword === null ? 'active' : ''"
                  @click="statusQueryKeyword = null"
                />
                <UiButtonMenuDivider />
                <UiButtonMenuItem
                  v-for="status in POST_STATUS_OPTIONS"
                  :key="`status-${status.value}`"
                  :icon="statusQueryKeyword === status.value ? '&#xe5cd;' : '&#xe061;'"
                  :icon-class="statusQueryKeyword === status.value ? '' : status.iconClass"
                  :item-text="status.label"
                  :custom-class="statusQueryKeyword === status.value ? 'active' : ''"
                  @click="toggleStatus(status.value)"
                />
              </template>
            </UiButtonMenu>

            <!-- Author -->
            <UiButtonMenu
              id="posts-filter-author"
              :variant="authorQueryKeyword ? 'tonal' : 'outline'"
              :color="authorQueryKeyword ? 'secondary' : undefined"
              :text="authorLabel"
              :is-mobile="isMobile"
              size="sm"
              tooltip-text="Author"
              icon-trailing
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5cf;" />
              </template>
              <template #menu>
                <UiButtonMenuItem
                  :icon="authorQueryKeyword ? '&#xe0b8;' : '&#xeb57;'"
                  :item-text="authorQueryKeyword ? 'Clear author' : 'All'"
                  :custom-class="authorQueryKeyword === null ? 'active' : ''"
                  @click="authorQueryKeyword = null"
                />
                <UiButtonMenuDivider />
                <UiButtonMenuItem
                  v-for="author in props.authors"
                  :key="`author-${author.id}`"
                  :icon="authorQueryKeyword === authorKey(author) ? '&#xe5cd;' : '&#xe7fd;'"
                  :item-text="author.name || 'Unknown'"
                  :custom-class="authorQueryKeyword === authorKey(author) ? 'active' : ''"
                  @click="toggleAuthor(author)"
                />
              </template>
            </UiButtonMenu>

            <!-- Tag -->
            <UiButtonMenu
              id="posts-filter-tag"
              :variant="tagQueryKeyword ? 'tonal' : 'outline'"
              :color="tagQueryKeyword ? 'secondary' : undefined"
              :text="tagLabel"
              :is-mobile="isMobile"
              size="sm"
              tooltip-text="Tag"
              icon-trailing
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5cf;" />
              </template>
              <template #menu>
                <UiButtonMenuItem
                  :icon="tagQueryKeyword ? '&#xe0b8;' : '&#xeb57;'"
                  :item-text="tagQueryKeyword ? 'Clear tag' : 'All'"
                  :custom-class="tagQueryKeyword === null ? 'active' : ''"
                  @click="tagQueryKeyword = null"
                />
                <UiButtonMenuDivider />
                <UiButtonMenuItem
                  v-for="tag in props.tags"
                  :key="`tag-${tag.id ?? tag.name}`"
                  :icon="tagQueryKeyword === tag.name ? '&#xe5cd;' : '&#xe892;'"
                  :item-text="tag.name || 'Unknown'"
                  :custom-class="tagQueryKeyword === tag.name ? 'active' : ''"
                  @click="toggleTag(tag.name)"
                />
              </template>
            </UiButtonMenu>

            <!-- Sort -->
            <UiButtonMenu
              id="posts-filter-sort"
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
                  v-for="sort in POST_SORT_OPTIONS"
                  :key="`sort-${sort.value}`"
                  :icon="sortByQueryKeyword === sort.value ? '&#xe876;' : '&#xe8d5;'"
                  :item-text="sort.label"
                  :custom-class="sortByQueryKeyword === sort.value ? 'active' : ''"
                  @click="sortByQueryKeyword = sort.value"
                />
              </template>
            </UiButtonMenu>
          </UiButtonGroup>

          <!-- Clear -->
          <div v-if="props.hasFilterActive">
            <UiButtonTooltip
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
        </div>

        <!-- Actions -->
        <div class="filter-actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </div>
</template>
