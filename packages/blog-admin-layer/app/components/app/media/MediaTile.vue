<script setup lang="ts">
import type { IMediaFile } from '#admin/shared/models/media'
import { isImageFile, mediaExtension } from '#admin/app/utils/media-filters'
import { formatBytes } from '#admin/shared/utils/media'

/** Interfaces */
interface IMediaTileProps {
  file: IMediaFile
  uses?: number
  isSelected?: boolean
}
interface IMediaTileEmits {
  open: [file: IMediaFile]
  toggle: [path: string]
}

/** Props */
const props = withDefaults(defineProps<IMediaTileProps>(), {
  uses: 0,
  isSelected: false
})

/** Emit */
const emit = defineEmits<IMediaTileEmits>()

/** Data */
const hasPreviewError = ref<boolean>(false)

/** Computed */
const hasPreview = computed<boolean>(() => Boolean(props.file.url) && isImageFile(props.file) && !hasPreviewError.value)
const usesLabel = computed<string>(() => props.uses ? `${props.uses} ${props.uses === 1 ? 'use' : 'uses'}` : 'Unused')
const spec = computed<string>(() => `${mediaExtension(props.file)} · ${formatBytes(props.file.size)}`)
</script>

<template>
  <figure
    class="media-tile"
    :class="{ 'is-selected': props.isSelected }"
  >
    <div class="media-tile-frame">
      <button
        type="button"
        class="media-tile-preview"
        :aria-label="`Open details for ${props.file.name}`"
        @click="emit('open', props.file)"
      >
        <img
          v-if="hasPreview"
          :src="props.file.url!"
          alt=""
          loading="lazy"
          decoding="async"
          @error="hasPreviewError = true"
        >
        <UiIconMaterial
          v-else
          icon-code="&#xe3f4;"
          class="media-tile-placeholder"
        />
      </button>
      <button
        type="button"
        role="checkbox"
        class="media-tile-check"
        :aria-checked="props.isSelected"
        :aria-label="`Select ${props.file.name}`"
        @click="emit('toggle', props.file.path)"
      >
        <UiIconMaterial
          icon-code="&#xe5ca;"
          class="iw-bold"
        />
      </button>
      <span class="media-tile-badge">
        <UiBadge
          :variant="props.uses ? 'tonal tonal-default' : 'tonal tonal-warning'"
          size="sm"
          :text="usesLabel"
        />
      </span>
    </div>
    <figcaption class="media-tile-caption">
      <span
        class="media-tile-name"
        :title="props.file.path"
      >
        {{ props.file.name }}
      </span>
      <span class="font-code fs-4xs text-muted">
        {{ spec }}
      </span>
    </figcaption>
  </figure>
</template>
