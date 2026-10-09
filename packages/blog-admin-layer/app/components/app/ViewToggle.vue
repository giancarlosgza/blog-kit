<script setup lang="ts">
/** Interfaces */
interface IViewToggleProps {
  gridLabel?: string
  listLabel?: string
}

/** Props */
const props = withDefaults(defineProps<IViewToggleProps>(), {
  gridLabel: 'Grid view',
  listLabel: 'List view'
})

/** Models */
const view = defineModel<'grid' | 'list'>('view', { default: 'grid' })

/** Computed */
const options = computed(() => [
  { id: 'grid' as const, label: props.gridLabel, icon: '&#xe8f0;' },
  { id: 'list' as const, label: props.listLabel, icon: '&#xe8ef;' }
])
</script>

<template>
  <UiButtonGroup
    connected
    aria-label="View"
  >
    <UiButtonTooltip
      v-for="option in options"
      :key="option.id"
      :variant="view === option.id ? 'tonal' : 'outline'"
      :color="view === option.id ? 'secondary' : undefined"
      icon
      size="sm"
      :tooltip-text="option.label"
      :aria-label="option.label"
      :aria-pressed="view === option.id"
      @click="view = option.id"
    >
      <template #icon>
        <UiIconMaterial :icon-code="option.icon" />
      </template>
    </UiButtonTooltip>
  </UiButtonGroup>
</template>
