<script setup lang="ts">
import type { IChipOption } from '@colorffy/ui'
import type { MediaFolder } from '#admin/shared/models/media'
import { MEDIA_FOLDERS } from '#admin/shared/models/media'

/** Interfaces */
interface IMediaFoldersProps {
  counts: Record<MediaFolder | 'all', number>
}
interface IFolderItem {
  id: MediaFolder | 'all'
  label: string
  icon: string
}

/** Props */
const props = defineProps<IMediaFoldersProps>()

/** Models */
const folder = defineModel<MediaFolder | null>('folder', { default: null })

/** Data */
const folderItems: IFolderItem[] = [
  { id: 'all', label: 'All', icon: '&#xe3f4;' },
  ...MEDIA_FOLDERS.map(item => ({ id: item, label: item, icon: '&#xe2c7;' }))
]

/** Computed */
const chipOptions = computed<IChipOption[]>(() => folderItems.map(item => ({
  id: item.id,
  text: `${item.label} ${props.counts[item.id] ?? 0}`
})))

/** Methods */
function isActive(id: IFolderItem['id']): boolean {
  return (folder.value ?? 'all') === id
}
function selectFolder(id: string | string[] | null): void {
  const next = Array.isArray(id) ? id[0] : id
  folder.value = !next || next === 'all' ? null : next as MediaFolder
}
</script>

<template>
  <div class="media-folders">
    <UiCard
      variant="pane"
      class="media-folders-pane"
    >
      <template #body>
        <UiSubheadingContent
          title="Folders"
          as="h2"
          gutter="none"
          class="mb-3"
        />
        <nav
          aria-label="Media folders"
          class="media-folders-list"
        >
          <button
            v-for="item in folderItems"
            :key="`folder-${item.id}`"
            type="button"
            class="media-folder"
            :class="{ 'is-active': isActive(item.id) }"
            :aria-current="isActive(item.id) ? 'true' : undefined"
            @click="selectFolder(item.id)"
          >
            <span class="media-folder-label">
              <UiIconMaterial
                :icon-code="item.icon"
                class="fs-lg"
              />
              {{ item.label }}
            </span>
            <span class="media-folder-count font-code">
              {{ props.counts[item.id] ?? 0 }}
            </span>
          </button>
        </nav>
      </template>
    </UiCard>

    <UiChipGroup
      :options="chipOptions"
      :model-value="folder ?? 'all'"
      variant="outline"
      color="secondary"
      aria-label="Media folders"
      custom-class="media-folders-chips"
      @update:model-value="selectFolder"
    />
  </div>
</template>
