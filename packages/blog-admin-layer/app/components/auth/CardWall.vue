<script setup lang="ts">
/** Props */
defineProps<{ offset?: number }>()

/** Composables */
const { blogName } = useAppConfig().admin
</script>

<template>
  <div
    class="auth-wall-default"
    aria-hidden="true"
  >
    <p class="auth-wall-default-title">
      {{ blogName }}
    </p>
  </div>
</template>
