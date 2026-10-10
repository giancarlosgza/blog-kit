<script setup lang="ts">
/** Composables */
const { t } = useBlogLabels()

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
      :title="t('scrollToTop')"
      :aria-label="t('scrollToTop')"
      rounded
      @click="scrollToTop"
    >
      <template #icon>
        <UiIconMaterial icon-code="&#xe5d8;" />
      </template>
    </UiButton>
  </UiButtonFabGroup>
</template>
