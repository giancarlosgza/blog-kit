<script setup lang="ts">
/** Interfaces */
interface IMediaSelectionBarProps {
  count: number
  deletableCount?: number
  canDelete?: boolean
}
interface IMediaSelectionBarEmits {
  copy: []
  delete: []
  clear: []
}

/** Props */
const props = withDefaults(defineProps<IMediaSelectionBarProps>(), {
  deletableCount: 0,
  canDelete: false
})

/** Emit */
const emit = defineEmits<IMediaSelectionBarEmits>()

/** Computed */
const deleteLabel = computed<string>(() => props.deletableCount && props.deletableCount < props.count
  ? `Delete ${props.deletableCount}`
  : 'Delete')
</script>

<template>
  <Transition name="media-selection">
    <div
      v-if="props.count > 0"
      role="toolbar"
      aria-label="Selected files"
      class="media-selection-bar"
    >
      <span
        class="media-selection-count font-code text-white opacity-80"
        aria-live="polite"
      >
        {{ props.count }} selected
      </span>
      <UiButton
        variant="text"
        size="sm"
        icon
        title="Copy URLs"
        aria-label="Copy URLs"
        custom-class="text-white"
        @click="emit('copy')"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe157;" />
        </template>
      </UiButton>
      <UiButtonTooltip
        v-if="props.canDelete"
        variant="tonal"
        color="danger"
        size="sm"
        :text="deleteLabel"
        :tooltip-text="props.deletableCount ? 'Delete the selected files that aren’t used anywhere' : 'Every selected file is in use'"
        :disabled="!props.deletableCount"
        @click="emit('delete')"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe872;" />
        </template>
      </UiButtonTooltip>
      <UiButton
        variant="text"
        icon
        size="sm"
        custom-class="text-white"
        aria-label="Clear selection"
        title="Clear selection"
        @click="emit('clear')"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5cd;" />
        </template>
      </UiButton>
    </div>
  </Transition>
</template>
