<script setup lang="ts">
import type { IDialogDisplay } from '@colorffy/ui'
import type { PostSort, PostStatusFilter } from '#admin/app/utils/post-filters'
import type { IAuthor } from '#admin/shared/models/author'
import type { ITag } from '#admin/shared/models/tag'
import { authorKey, DEFAULT_POST_SORT, POST_SORT_OPTIONS, POST_STATUS_OPTIONS } from '#admin/app/utils/post-filters'

/** Interfaces */
interface IPostsFiltersSideSheetProps {
  authors?: IAuthor[] | null
  tags?: ITag[] | null
  hasFilterActive?: boolean
}
interface IPostsFiltersSideSheetEmits {
  clearAll: []
}

/** Props */
const props = withDefaults(defineProps<IPostsFiltersSideSheetProps>(), {
  authors: null,
  tags: null,
  hasFilterActive: false
})

/** Emit */
const emit = defineEmits<IPostsFiltersSideSheetEmits>()

/** Models */
const statusQueryKeyword = defineModel<PostStatusFilter | null>('statusQueryKeyword', { default: null })
const authorQueryKeyword = defineModel<string | null>('authorQueryKeyword', { default: null })
const tagQueryKeyword = defineModel<string | null>('tagQueryKeyword', { default: null })
const sortByQueryKeyword = defineModel<PostSort>('sortByQueryKeyword', { default: DEFAULT_POST_SORT })

/** Data */
const dialogRef = ref<IDialogDisplay | null>(null)

/** Methods */
function showDialog(): void {
  dialogRef.value?.showDialog()
}
function closeDialog(): void {
  dialogRef.value?.closeDialog()
}
function toggleStatus(status: PostStatusFilter): void {
  statusQueryKeyword.value = statusQueryKeyword.value === status ? null : status
}
function toggleAuthor(author: IAuthor): void {
  const key = authorKey(author)
  authorQueryKeyword.value = authorQueryKeyword.value === key ? null : key
}
function toggleTag(tag: string): void {
  tagQueryKeyword.value = tagQueryKeyword.value === tag ? null : tag
}

defineExpose({
  showDialog,
  closeDialog
})
</script>

<template>
  <UiModal
    ref="dialogRef"
    mode="side-sheet"
    body-custom-class="scroll-fade-block-effect"
    class="dialog-backdrop-blur"
    aria-labelledby="posts-filters-dialog-title"
    aria-describedby="posts-filters-dialog-description"
  >
    <template #header>
      <h2
        id="posts-filters-dialog-title"
        class="dialog-title fs-base fw-800"
      >
        Filters
      </h2>
      <span
        id="posts-filters-dialog-description"
        class="visually-hidden"
      >
        Filter posts by status, author and tag, and change their sort order
      </span>
      <UiButton
        variant="outline"
        title="Close filters dialog"
        aria-label="Close filters dialog"
        icon
        size="sm"
        @click="closeDialog"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5cd;" />
        </template>
      </UiButton>
    </template>
    <template #body>
      <!-- Status -->
      <section aria-labelledby="posts-status-section">
        <h3
          id="posts-status-section"
          class="subtitle-1 fw-500 mb-3"
        >
          Status
        </h3>
        <UiButtonGroup aria-label="Filter by status">
          <UiButton
            v-for="status in POST_STATUS_OPTIONS"
            :key="`status-${status.value}`"
            :text="status.label"
            :variant="statusQueryKeyword === status.value ? 'tonal' : 'outline'"
            :color="statusQueryKeyword === status.value ? 'secondary' : undefined"
            :aria-pressed="statusQueryKeyword === status.value"
            :aria-label="`Show ${status.label.toLowerCase()} posts`"
            size="sm"
            @click="toggleStatus(status.value)"
          >
            <template #icon>
              <UiIconMaterial
                v-if="statusQueryKeyword === status.value"
                icon-code="&#xe876;"
                class="iw-bold"
              />
            </template>
          </UiButton>
        </UiButtonGroup>
      </section>

      <!-- Sort -->
      <section
        aria-labelledby="posts-sort-section"
        class="mt-section"
      >
        <h3
          id="posts-sort-section"
          class="subtitle-1 fw-500 mb-3"
        >
          Sort
        </h3>
        <UiButtonGroup aria-label="Sort options">
          <UiButton
            v-for="sort in POST_SORT_OPTIONS"
            :key="`sort-${sort.value}`"
            :text="sort.label"
            :variant="sortByQueryKeyword === sort.value ? 'tonal' : 'outline'"
            :color="sortByQueryKeyword === sort.value ? 'secondary' : undefined"
            :aria-pressed="sortByQueryKeyword === sort.value"
            :aria-label="`Sort by ${sort.label.toLowerCase()}`"
            size="sm"
            @click="sortByQueryKeyword = sort.value"
          >
            <template #icon>
              <UiIconMaterial
                v-if="sortByQueryKeyword === sort.value"
                icon-code="&#xe876;"
                class="iw-bold"
              />
            </template>
          </UiButton>
        </UiButtonGroup>
      </section>

      <!-- Authors -->
      <section
        v-if="props.authors?.length"
        aria-labelledby="posts-authors-section"
        class="mt-section"
      >
        <h3
          id="posts-authors-section"
          class="subtitle-1 fw-500 mb-3"
        >
          Author
        </h3>
        <UiButtonGroup aria-label="Filter by author">
          <UiButton
            v-for="author in props.authors"
            :key="`author-${author.id}`"
            :text="author.name || 'Unknown'"
            :variant="authorQueryKeyword === authorKey(author) ? 'tonal' : 'outline'"
            :color="authorQueryKeyword === authorKey(author) ? 'secondary' : undefined"
            :aria-pressed="authorQueryKeyword === authorKey(author)"
            :aria-label="`Filter by ${author.name}`"
            size="sm"
            @click="toggleAuthor(author)"
          >
            <template #icon>
              <UiIconMaterial
                v-if="authorQueryKeyword === authorKey(author)"
                icon-code="&#xe876;"
                class="iw-bold"
              />
            </template>
          </UiButton>
        </UiButtonGroup>
      </section>

      <!-- Tags -->
      <section
        v-if="props.tags?.length"
        aria-labelledby="posts-tags-section"
        class="mt-section"
      >
        <h3
          id="posts-tags-section"
          class="subtitle-1 fw-500 mb-3"
        >
          Tag
        </h3>
        <UiButtonGroup aria-label="Filter by tag">
          <UiButton
            v-for="tag in props.tags"
            :key="`tag-${tag.id ?? tag.name}`"
            :text="tag.name || 'Unknown'"
            :variant="tagQueryKeyword === tag.name ? 'tonal' : 'outline'"
            :color="tagQueryKeyword === tag.name ? 'secondary' : undefined"
            :aria-pressed="tagQueryKeyword === tag.name"
            :aria-label="`Filter by ${tag.name} tag`"
            size="sm"
            @click="toggleTag(tag.name)"
          >
            <template #icon>
              <UiIconMaterial
                v-if="tagQueryKeyword === tag.name"
                icon-code="&#xe876;"
                class="iw-bold"
              />
            </template>
          </UiButton>
        </UiButtonGroup>
      </section>
    </template>
    <template #footer>
      <UiButton
        variant="tonal"
        color="neutral"
        text="Clear filters"
        title="Clear all active filters"
        aria-label="Clear all active filters"
        :disabled="!props.hasFilterActive"
        @click="emit('clearAll')"
      />
      <UiButton
        variant="text"
        class="text-neutral"
        text="Close"
        title="Close filters dialog"
        aria-label="Close filters dialog"
        @click="closeDialog"
      />
    </template>
  </UiModal>
</template>
