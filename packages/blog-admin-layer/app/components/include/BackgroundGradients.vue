<script setup lang="ts">
/** Interfaces */
interface IBackgroundGradientsProps {
  variant?: 'waves'
}

/** Props */
withDefaults(defineProps<IBackgroundGradientsProps>(), {
  variant: 'waves'
})
</script>

<template>
  <div
    :class="`bg-gradient-${variant}`"
    aria-hidden="true"
  >
    <div class="gradient-background">
      <div class="gradient-background-shape gradient-shape-1" />
      <div class="gradient-background-shape gradient-shape-2" />
    </div>
  </div>
</template>
