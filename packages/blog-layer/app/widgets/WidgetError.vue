<script setup lang="ts">
defineProps<{ title: string, reason?: string }>()
</script>

<template>
  <div class="widget-error" role="alert">
    <UiIconMaterial icon-code="&#xe40a;" />
    <span>
      <strong>{{ title }}</strong>
      <template v-if="reason"> — {{ reason }}</template>
    </span>
  </div>
</template>
