<script setup lang="ts">
defineProps<{ reason?: string }>()
</script>

<template>
  <div class="widget-error" role="alert">
    <UiIconMaterial icon-code="&#xe40a;" />
    <span>
      <strong>Interactive widget unavailable</strong>
      <template v-if="reason"> — {{ reason }}</template>
    </span>
  </div>
</template>
