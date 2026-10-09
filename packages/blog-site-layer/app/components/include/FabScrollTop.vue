<script setup lang="ts">
/** Methods */
function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <UiButtonFabGroup>
    <UiButton
      variant="tonal"
      color="primary"
      class="btn-fab fab-scroll"
      title="Scroll to top"
      aria-label="Scroll to top"
      rounded
      @click="scrollToTop"
    >
      <template #icon>
        <UiIconMaterial icon-code="&#xe5d8;" />
      </template>
    </UiButton>
  </UiButtonFabGroup>
</template>
