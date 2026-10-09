<script setup lang="ts">
import { computed } from 'vue'

/** Interfaces */
interface BrowserItem {
  browser?: string | null
  visitors?: number | null
}
interface IProps {
  stats?: BrowserItem[] | null
  isLoading?: boolean | null
  title?: string
  limit?: number
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  stats: () => [],
  isLoading: false,
  title: 'Top browsers',
  limit: 5
})

/** Data */
const fallbackLabels = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other']
const colors = [
  'rgb(from var(--cffy-success-base-fixed) r g b / 1)',
  'rgb(from var(--cffy-accent-base-fixed) r g b / 1)',
  'rgb(from var(--cffy-warning-base-fixed) r g b / 1)',
  'rgb(from var(--cffy-secondary-base-fixed) r g b / 1)',
  'rgb(from var(--cffy-muted-base-fixed) r g b / 1)',
  'rgb(from var(--cffy-primary-base-fixed) r g b / 1)'
]

/** Computed */
const normalized = computed(() => {
  const items = (props.stats ?? []).map(s => ({
    name: (s?.browser ?? 'Unknown') as string,
    visitors: Number(s?.visitors ?? 0)
  }))

  items.sort((a, b) => b.visitors - a.visitors)
  const top = items.slice(0, props.limit)
  const rest = items.slice(props.limit)
  const otherSum = rest.reduce((acc, it) => acc + (Number.isFinite(it.visitors) ? it.visitors : 0), 0)
  if (otherSum > 0) {
    top.push({ name: 'Other', visitors: otherSum })
  }
  return top
})
const labels = computed(() => (normalized.value.length ? normalized.value.map(i => i.name) : fallbackLabels))
const chartValues = computed(() => (normalized.value.length ? normalized.value.map(i => Math.max(0, i.visitors)) : [0, 0, 0, 0, 0]))
</script>

<template>
  <UiCard
    variant="pane"
  >
    <template #body>
      <div class="analytics-grid">
        <div class="analytics-grid-header">
          <p class="subtitle-2">
            <UiIconMaterial icon-code="&#xef4a;" class="fs-xs text-secondary iw-bold lh-base me-1" />
            {{ title }}
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
          :show-ticks="false"
          :show-grid-lines="false"
          data-label="Browsers"
          empty-state-title="No browser data"
          empty-state-subtitle="Browser data will appear once analytics are available."
        />
      </div>
    </template>
  </UiCard>
</template>
