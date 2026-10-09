<script setup lang="ts">
import { computed } from 'vue'

/** Interfaces */
interface IProps {
  stats?: number | { value: number | null } | null
  isLoading?: boolean | null
  title?: string
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  stats: 0,
  isLoading: false,
  title: 'Bounce rate'
})

/** Data */
const labels = ['Bounced', 'Continued']
const colors = [
  'rgb(from var(--cffy-danger-base-fixed) r g b / 1)',
  'rgb(from var(--cffy-success-base-fixed) r g b / 1)'
]

/** Computed */
const bounceValue = computed<number>(() => {
  const s = props.stats as any
  const raw = typeof s === 'number' ? s : (s && typeof s.value !== 'undefined' ? s.value : 0)
  const n = Number(raw ?? 0)

  if (!Number.isFinite(n)) {
    return 0
  }
  return Math.min(100, Math.max(0, n))
})
const chartValues = computed<number[]>(() => {
  const v = bounceValue.value
  return [v, Math.max(0, 100 - v)]
})
</script>

<template>
  <UiCard
    variant="pane"
  >
    <template #body>
      <div class="analytics-grid">
        <div class="analytics-grid-header">
          <p class="subtitle-2">
            <UiIconMaterial class="fs-xs text-danger iw-bold lh-base me-1" icon-code="&#xef4a;" />
            Bounce rate
          </p>
        </div>

        <AppStatsChart
          :title="title"
          chart-type="doughnut"
          :labels="labels"
          :data="chartValues"
          :colors="colors"
          :is-loading="isLoading"
          cutout="75%"
          :spacing="10"
          :border-radius="25"
          :circumference="180"
          :rotation="-90"
          :show-ticks="false"
          :show-grid-lines="false"
          data-label="Bounce rate"
          empty-state-title="No bounce data"
          empty-state-subtitle="Bounce data will appear once analytics are available."
        />
      </div>
    </template>
  </UiCard>
</template>
