<script setup lang="ts">
import type { IDatatableColumn } from '@colorffy/ui'
import type { IPost, PostStatus } from '@giancarlosgza/blog-core'
import { breakpointsBootstrapV5, useBreakpoints } from '@vueuse/core'
import { resolvePostStatus } from '#admin/shared/utils/post-status'

/** Interfaces */
interface IProps {
  posts?: IPost[] | null
  isLoading?: boolean | null
  summary?: string | null
}
interface ITableItem {
  uuid?: string
  title?: string
  shortText?: string
  author?: string
  slug?: string
  color?: string
  isPublished?: boolean
  status: PostStatus
  date?: any
  original: IPost
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  posts: null,
  isLoading: null,
  summary: null
})

/** Emit */
const emit = defineEmits<{
  delete: [post: IPost]
}>()

/** Data */
const { defaultAuthor } = useAppConfig().admin
const tableColumns: IDatatableColumn[] = [
  { key: 'uuid', label: 'UUID', hidden: true },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Excerpt' },
  { key: 'slug', label: 'Slug' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Updated' },
  { key: 'actions', label: 'Actions', sortable: false }
]
const breakpoints = useBreakpoints(breakpointsBootstrapV5)
const isMobile = breakpoints.smallerOrEqual('sm')

/** Composables */
const { blogUrl } = useBlogUrl()
const { formatDate, formatTitleDate } = useAdminDateFormat()

/** Computed */
const tableItems = computed<ITableItem[]>(() => {
  if (!props.posts?.length) {
    return []
  }
  return props.posts.map((item: IPost) => ({
    uuid: item.id,
    title: item.title,
    shortText: item.shortText,
    author: resolveAuthorName(item, defaultAuthor),
    slug: item.slug ?? item.id,
    color: item.color,
    isPublished: item.isPublished,
    status: resolvePostStatus(item),
    date: item.updatedAt as any,
    original: item
  }))
})
const normalizedLoading = computed<boolean | undefined>(() => props.isLoading ?? undefined)

/** Methods */
function handleEditPost(item: IPost): void {
  navigateTo(`/posts/${item.id}`)
}
function handleViewPost(item: IPost): void {
  navigateTo(`${blogUrl}/${item.slug ?? item.id}`, {
    external: true,
    open: { windowFeatures: { noopener: true }, target: '_blank' }
  })
}
</script>

<template>
  <UiDatatable
    :columns="tableColumns"
    :items="tableItems"
    :is-loading="normalizedLoading"
    :skeleton-rows="12"
    table-class="table-bordered"
    sortable column-manager
    empty-state-title="No posts yet"
    empty-state-subtitle="Create your first post to get started."
    class="d-grid"
    :toolbar-button="{ variant: 'text' }"
  >
    <template #controls>
      <AppTableSummary :text="props.summary || `${tableItems.length} posts`" />
    </template>
    <template #cell-uuid="{ item }">
      <span
        class="fw-500 text-muted"
        :title="item.uuid || 'N/A'"
      >
        {{ item.uuid }}
      </span>
    </template>
    <template #cell-title="{ item }">
      <span class="d-inline-flex align-items-center gap-2">
        <UiIconMaterial
          icon-code="&#xef42;"
          :style="{ '--_bg-relative-base-color': item.color || '#e0e0e0', '--_bg-relative-alpha': 0.35 }"
          class="fs-sm bg-relative-color initials-avatar mx-0"
        />
        <span class="d-inline-flex flex-column align-items-start gap-1 lh-sm">
          <span class="fw-500">
            {{ item.title || item.uuid }}
          </span>
          <span class="text-muted">
            {{ item.author }}
          </span>
        </span>
      </span>
    </template>
    <template #cell-description="{ item }">
      <span
        class="text-muted"
        :title="item.shortText"
      >
        {{ truncateText(item.shortText, 50) }}
      </span>
    </template>
    <template #cell-slug="{ item }">
      <span class="text-link text-info">
        /{{ item.slug }}
      </span>
    </template>
    <template #cell-status="{ item }">
      <AppPostsStatusBadge :status="item.status" />
    </template>
    <template #cell-date="{ item }">
      <span
        class="text-muted fl-capitalize"
        :title="formatTitleDate(item.date)"
      >
        {{ formatDate(item.date) }}
      </span>
    </template>
    <template #cell-actions="{ item }">
      <UiButtonGroup
        class="flex-nowrap"
        connected
      >
        <UiButtonTooltip
          :id="`post-${item.uuid}-edit`"
          variant="chip"
          text="Edit"
          tooltip-text="Edit post"
          @click="handleEditPost(item.original)"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe3c9;" />
          </template>
        </UiButtonTooltip>
        <UiButtonMenu
          :id="`post-${item.uuid}-actions`"
          variant="chip"
          icon
          tooltip-text="View post actions"
          :is-mobile="isMobile"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe5d3;" />
          </template>
          <template #menu>
            <UiButtonMenuItem
              icon="&#xe3c9;"
              item-text="Edit"
              @click="handleEditPost(item.original)"
            />
            <template v-if="item.isPublished">
              <UiButtonMenuDivider />
              <UiButtonMenuItem
                icon="&#xe89e;"
                item-text="View on blog"
                @click="handleViewPost(item.original)"
              />
            </template>
            <UiButtonMenuDivider />
            <UiButtonMenuItem
              icon="&#xe872;"
              item-text="Delete"
              is-destructive
              @click="emit('delete', item.original)"
            />
          </template>
        </UiButtonMenu>
      </UiButtonGroup>
    </template>
  </UiDatatable>
</template>
