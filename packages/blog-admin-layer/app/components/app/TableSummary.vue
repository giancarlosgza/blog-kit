<script setup lang="ts">
/** Interfaces */
interface ITableSummaryProps {
  text: string
  label?: string
}

/** Props */
const props = withDefaults(defineProps<ITableSummaryProps>(), {
  label: 'Showing'
})
</script>

<template>
  <div class="text-start">
    <p class="fs-4xs text-muted mb-0">
      {{ props.label }}
    </p>
    <p class="fs-3xs font-secondary fw-500 mb-0">
      {{ props.text }}
    </p>
  </div>
</template>
