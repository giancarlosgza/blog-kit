<script setup lang="ts">
/** Props */
const { line } = defineProps(['line'])
</script>

<template>
  <UiListItem
    :text="line"
    has-actions
  >
    <template #list-action>
      <slot name="action" />
    </template>
  </UiListItem>
</template>
