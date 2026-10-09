<script setup lang="ts">
import type { IDatatableColumn } from '@colorffy/ui'
import type { ITag } from '@giancarlosgza/blog-core'
import { breakpointsBootstrapV5, useBreakpoints } from '@vueuse/core'

/** Interfaces */
interface IProps {
  tags?: ITag[] | null
  isLoading?: boolean | null
}
interface ITableItem {
  uuid?: string
  name?: string
  slug?: string
  count?: number
  date?: any
  original: ITag
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  tags: null,
  isLoading: null
})

/** Emit */
const emit = defineEmits<{
  edit: [tag: ITag]
  delete: [tag: ITag]
}>()

/** Data */
const tableColumns: IDatatableColumn[] = [
  { key: 'uuid', label: 'UUID', hidden: true },
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'count', label: 'Posts' },
  { key: 'date', label: 'Date' },
  { key: 'actions', label: 'Actions', sortable: false }
]
const breakpoints = useBreakpoints(breakpointsBootstrapV5)
const isMobile = breakpoints.smallerOrEqual('sm')

/** Composables */
const { blogUrl } = useBlogUrl()
const { formatDate, formatTitleDate } = useAdminDateFormat()

/** Computed */
const tableItems = computed<ITableItem[]>(() => {
  if (!props.tags?.length) {
    return []
  }
  return props.tags.map((item: ITag) => ({
    uuid: item.id,
    name: item.name,
    slug: item.slug,
    count: item.count ?? 0,
    date: item.createdAt,
    original: item
  }))
})
const normalizedLoading = computed<boolean | undefined>(() => props.isLoading ?? undefined)

/** Methods */
function handleViewTag(item: ITag): void {
  navigateTo(`${blogUrl}/tags/${encodeURIComponent(item.name)}`, {
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
    :skeleton-rows="10"
    table-class="table-bordered"
    sortable column-manager
    empty-state-title="No tags yet"
    empty-state-subtitle="Create your first tag to organize posts."
    class="d-grid"
    :toolbar-button="{ variant: 'text' }"
  >
    <template #controls>
      <AppTableSummary :text="`${tableItems.length} tags`" />
    </template>
    <template #cell-uuid="{ item }">
      <span
        class="fw-500 text-muted"
        :title="item.uuid || 'N/A'"
      >
        {{ item.uuid }}
      </span>
    </template>
    <template #cell-name="{ item }">
      <span class="d-inline-flex align-items-center gap-2">
        <UiIconMaterial
          icon-code="&#xe892;"
          class="fs-sm bg-muted-fixed bg-opacity-20 initials-avatar mx-0"
        />
        <span class="fw-500">
          {{ item.name }}
        </span>
      </span>
    </template>
    <template #cell-slug="{ item }">
      <span
        v-if="item.slug"
        class="text-link text-info"
      >
        /{{ item.slug }}
      </span>
      <span
        v-else
        class="text-muted"
      >N/A</span>
    </template>
    <template #cell-count="{ item }">
      <UiBadge
        variant="outline"
        size="sm"
        :text="`${item.count ?? 0} ${item.count === 1 ? 'post' : 'posts'}`"
        icon-code="&#xef42;"
        icon-class="fs-sm text-muted"
      />
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
          :id="`tag-${item.uuid}-edit`"
          variant="chip"
          text="Edit"
          tooltip-text="Edit tag"
          @click="emit('edit', item.original)"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe3c9;" />
          </template>
        </UiButtonTooltip>
        <UiButtonMenu
          :id="`tag-${item.uuid}-actions`"
          variant="chip"
          icon
          tooltip-text="View tag actions"
          :is-mobile="isMobile"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe5d3;" />
          </template>
          <template #menu>
            <UiButtonMenuItem
              icon="&#xe3c9;"
              item-text="Edit"
              @click="emit('edit', item.original)"
            />
            <UiButtonMenuItem
              icon="&#xe89e;"
              item-text="Visit on blog"
              @click="handleViewTag(item.original)"
            />
            <UiButtonMenuDivider />
            <UiButtonMenuItem
              icon="&#xe872;"
              :item-text="`Delete ${item.name}`"
              is-destructive
              @click="emit('delete', item.original)"
            />
          </template>
        </UiButtonMenu>
      </UiButtonGroup>
    </template>
  </UiDatatable>
</template>
