<script setup lang="ts">
import type { IMediaFile, MediaUsageMap } from '#admin/shared/models/media'

/** Interfaces */
interface IMediaGridProps {
  files: IMediaFile[]
  usage: MediaUsageMap
  selected?: string[]
  isLoading?: boolean
}
interface IMediaGridEmits {
  open: [file: IMediaFile]
  toggle: [path: string]
}

/** Props */
const props = withDefaults(defineProps<IMediaGridProps>(), {
  selected: () => [],
  isLoading: false
})

/** Emit */
const emit = defineEmits<IMediaGridEmits>()

/** Computed */
const selectedSet = computed<Set<string>>(() => new Set(props.selected))
</script>

<template>
  <div
    v-if="props.isLoading && !props.files.length"
    class="media-grid"
    role="status"
    aria-label="Loading files"
  >
    <div
      v-for="index in 12"
      :key="`media-skeleton-${index}`"
      class="media-tile"
    >
      <UiBaseSkeleton
        variant="thumbnail"
        width="100%"
        height="auto"
        custom-class="media-tile-skeleton"
      />
      <UiBaseSkeleton
        size="sm"
        width="70%"
      />
      <UiBaseSkeleton
        size="sm"
        width="45%"
      />
    </div>
  </div>
  <div
    v-else
    class="media-grid"
    :class="{ 'is-selecting': selectedSet.size > 0 }"
  >
    <AppMediaTile
      v-for="file in props.files"
      :key="file.path"
      :file="file"
      :uses="props.usage[file.path]?.length ?? 0"
      :is-selected="selectedSet.has(file.path)"
      @open="emit('open', $event)"
      @toggle="emit('toggle', $event)"
    />
  </div>
</template>
