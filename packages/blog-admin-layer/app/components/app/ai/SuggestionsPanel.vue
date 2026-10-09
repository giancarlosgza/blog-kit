<script setup lang="ts">
/** Props */
const props = withDefaults(defineProps<{
  suggestions: string[]
  loading?: boolean
  title?: string
  readonly?: boolean
}>(), {
  loading: false,
  title: 'AI suggestions',
  readonly: false
})

/** Emit */
const emit = defineEmits<{
  apply: [value: string]
  dismiss: []
}>()

/** Data */
const panelId = useId()

/** Methods */
function onApply(line: string) {
  if (!props.readonly) {
    emit('apply', line)
  }
}
</script>

<template>
  <div
    v-if="loading"
    class="d-grid gap-2"
    role="status"
    aria-label="AI suggestions are being generated"
  >
    <div class="skeleton skeleton-ai-generation col-10" />
    <div class="skeleton skeleton-ai-generation col-12" />
    <div class="skeleton skeleton-ai-generation col-8" />
  </div>

  <div
    v-else-if="suggestions.length"
    class="ai-panel d-grid gap-2 p-2"
  >
    <div class="d-flex justify-content-between align-items-center ps-1">
      <p class="fs-3xs fw-600 mb-0">
        {{ title }}
      </p>
      <UiButtonTooltip
        :id="`${panelId}-dismiss-suggestions`"
        variant="text"
        size="sm"
        icon
        tooltip-text="Dismiss suggestions"
        @click="emit('dismiss')"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5cd;" />
        </template>
      </UiButtonTooltip>
    </div>
    <UiListGroup
      variant="flush"
      size="sm"
      :is-interactive="!readonly"
      is-undecorated
    >
      <AppAiPromptsListItem
        v-for="(line, index) in suggestions"
        :key="index"
        :line="line"
        @click="onApply(line)"
      />
    </UiListGroup>
  </div>
</template>
