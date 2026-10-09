<script setup lang="ts">
/** Composables */
useBlogSettings()
</script>

<template>
  <main>
    <!-- Content -->
    <TheNavbar />
    <slot />
    <IncludeFabScrollTop />
    <LazyTheFooter hydrate-on-visible />

    <!-- PWA Prompt -->
    <LazyIncludePwaPromptAlert />
  </main>
</template>
