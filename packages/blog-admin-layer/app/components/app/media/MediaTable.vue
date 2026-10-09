<script setup lang="ts">
import type { IDatatableColumn } from '@colorffy/ui'
import type { IMediaFile, MediaUsageMap } from '#admin/shared/models/media'
import { isImageFile, mediaExtension } from '#admin/app/utils/media-filters'
import { formatBytes } from '#admin/shared/utils/media'

/** Interfaces */
interface IMediaTableProps {
  files: IMediaFile[]
  usage: MediaUsageMap
  isLoading?: boolean
}
interface IMediaTableEmits {
  open: [file: IMediaFile]
}
interface ITableItem {
  path: string
  name: string
  folder: string
  type: string
  size: number
  updated: number | null
  uses: number
  original: IMediaFile
}

/** Props */
const props = withDefaults(defineProps<IMediaTableProps>(), {
  isLoading: false
})

/** Emit */
const emit = defineEmits<IMediaTableEmits>()

/** Models */
const selected = defineModel<string[]>('selected', { default: () => [] })

/** Data */
const tableColumns: IDatatableColumn[] = [
  { key: 'name', label: 'File' },
  { key: 'folder', label: 'Folder' },
  { key: 'type', label: 'Type' },
  { key: 'size', label: 'Size' },
  { key: 'updated', label: 'Updated' },
  { key: 'uses', label: 'Usage' },
  { key: 'actions', label: 'Actions', sortable: false }
]

/** Composables */
const { formatDate, formatTitleDate } = useAdminDateFormat()

/** Computed */
const tableItems = computed<ITableItem[]>(() => props.files.map(file => ({
  path: file.path,
  name: file.name,
  folder: file.folder,
  type: mediaExtension(file),
  size: file.size,
  updated: file.updated,
  uses: props.usage[file.path]?.length ?? 0,
  original: file
})))
const selectedRows = computed<(string | number)[]>({
  get: () => selected.value,
  set: value => selected.value = value.map(String)
})
</script>

<template>
  <UiDatatable
    v-model:selected="selectedRows"
    :columns="tableColumns"
    :items="tableItems"
    :is-loading="props.isLoading && !props.files.length"
    :skeleton-rows="8"
    :sortable="false"
    row-key="path"
    table-class="table-bordered"
    selectable
    empty-state-title="No files"
    empty-state-subtitle="Nothing matches the current folder and filters."
    class="d-grid media-table"
    :toolbar-button="{ variant: 'text' }"
  >
    <template #cell-name="{ item }">
      <button
        type="button"
        class="media-table-file"
        :title="item.path"
        @click="emit('open', item.original)"
      >
        <span class="media-table-thumb">
          <img
            v-if="item.original.url && isImageFile(item.original)"
            :src="item.original.url"
            alt=""
            loading="lazy"
            decoding="async"
          >
          <UiIconMaterial
            v-else
            icon-code="&#xe3f4;"
            class="fs-base text-muted"
          />
        </span>
        <span class="media-table-name">
          <span class="fw-500">{{ item.name }}</span>
          <span class="font-code fs-4xs text-muted">{{ item.path }}</span>
        </span>
      </button>
    </template>
    <template #cell-folder="{ item }">
      <span class="font-code text-muted">{{ item.folder }}/</span>
    </template>
    <template #cell-type="{ item }">
      <span class="font-code text-muted">{{ item.type }}</span>
    </template>
    <template #cell-size="{ item }">
      <span class="font-code">{{ formatBytes(item.size) }}</span>
    </template>
    <template #cell-updated="{ item }">
      <span
        class="text-muted fl-capitalize"
        :title="formatTitleDate(item.updated)"
      >
        {{ formatDate(item.updated) }}
      </span>
    </template>
    <template #cell-uses="{ item }">
      <UiBadge
        :variant="item.uses ? 'tonal tonal-default' : 'tonal tonal-warning'"
        size="sm"
        :text="item.uses ? `${item.uses} ${item.uses === 1 ? 'use' : 'uses'}` : 'Unused'"
      />
    </template>
    <template #cell-actions="{ item }">
      <UiButtonTooltip
        variant="chip"
        text="Details"
        tooltip-text="Show file details"
        @click="emit('open', item.original)"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe8f4;" />
        </template>
      </UiButtonTooltip>
    </template>
  </UiDatatable>
</template>
