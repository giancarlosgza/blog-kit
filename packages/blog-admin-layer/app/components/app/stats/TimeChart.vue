<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js'
import type { TimeseriesStats } from '#admin/shared/types/stats/timeseries'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/** Interfaces */
interface IProps {
  stats?: TimeseriesStats[] | null
  isLoading?: boolean | null
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  stats: () => [],
  isLoading: false
})

/** Data */
const chartData = ref<ChartData<'line'>>({ labels: [], datasets: [] })
const chartOptions = ref<ChartOptions<'line'>>()
const chartTime = ref<{ refresh: () => void, getCanvas: () => HTMLCanvasElement | null } | null>(null)
const colorMode = useColorMode()
const systemMediaQuery = ref<MediaQueryList | null>(null)

/** Computed */
const hasStatsData = computed(() => (props.stats?.length ?? 0) > 0)
const shouldShowEmptyState = computed(() => !props.isLoading && !hasStatsData.value)

/** Watch */
watch(() => props.stats, () => {
  if (import.meta.client)
    updateChart()
}, { immediate: true })
watch(() => colorMode.value, () => {
  if (import.meta.client) {
    refreshChartTheme()
    registerSystemThemeListener()
  }
}, { immediate: true })

/** Lifecycle */
onMounted(() => {
  chartData.value = setChartData()
  chartOptions.value = setChartOptions()
  updateChart()
  registerSystemThemeListener()
})
onBeforeUnmount(() => {
  unregisterSystemThemeListener()
})

/** Methods */
function setChartData(): ChartData<'line'> {
  const documentStyle = getComputedStyle(document.documentElement)

  return {
    labels: [],
    datasets: [
      {
        label: 'Visitors',
        data: [],
        fill: true,
        tension: 0.2,
        borderWidth: 2,
        borderJoinStyle: 'round' as const,
        borderColor: documentStyle.getPropertyValue('--cffy-primary-a10'),
        backgroundColor: `rgb(from ${documentStyle.getPropertyValue('--cffy-primary-base-fixed')} r g b / 0.20)`,
        hoverBorderColor: documentStyle.getPropertyValue('--cffy-accent-a10'),
        hoverBackgroundColor: `rgb(from ${documentStyle.getPropertyValue('--cffy-accent-base-fixed')} r g b / 1)`,
        showLine: true,
        indexAxis: 'x' as const
      }
    ]
  }
}
function createGradientFill() {
  const canvas = chartTime.value?.getCanvas()
  if (!canvas)
    return null

  const ctx = canvas.getContext('2d')
  if (!ctx)
    return null

  const documentStyle = getComputedStyle(document.documentElement)
  const gradientFill = ctx.createLinearGradient(0, 0, 0, 300)
  gradientFill.addColorStop(0, `rgb(from ${documentStyle.getPropertyValue('--cffy-primary-base-fixed')} r g b / 0.40)`)
  gradientFill.addColorStop(1, `rgb(from ${documentStyle.getPropertyValue('--cffy-primary-base-fixed')} r g b / 0.05)`)

  return gradientFill
}
function setChartOptions(): ChartOptions<'line'> {
  const documentStyle = getComputedStyle(document.documentElement)
  const textColor = documentStyle.getPropertyValue('--cffy-muted-a10')
  const textColorSecondary = documentStyle.getPropertyValue('--cffy-muted-a10')
  const surfaceBorder = documentStyle.getPropertyValue('--cffy-outline-button')
  const gridColor = 'transparent'

  return {
    maintainAspectRatio: false,
    aspectRatio: 0.6,
    plugins: {
      legend: {
        labels: {
          color: textColor
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: textColorSecondary
        },
        grid: {
          display: false,
          color: gridColor
        }
      },
      y: {
        ticks: {
          color: textColorSecondary
        },
        grid: {
          color: surfaceBorder
        }
      }
    }
  }
}
function updateChart() {
  if (!chartData.value) {
    chartData.value = setChartData()
  }

  const labels = (props.stats ?? []).map(entry => entry?.date ?? '')
  const visitors = (props.stats ?? []).map(entry => Number(entry?.visitors ?? 0))

  chartData.value.labels = labels

  if (chartData.value.datasets[0]) {
    chartData.value.datasets[0].data = visitors

    // Apply gradient fill if canvas is available
    const gradientFill = createGradientFill()
    if (gradientFill) {
      chartData.value.datasets[0].backgroundColor = gradientFill
    }

    // Highlight the highest value point
    const maxValue = Math.max(...visitors)
    const documentStyle = getComputedStyle(document.documentElement)
    const pointBackgroundColors = visitors.map(value =>
      value === maxValue
        ? documentStyle.getPropertyValue('--cffy-success-a10')
        : documentStyle.getPropertyValue('--cffy-primary-a10')
    )
    const pointBorderColors = visitors.map(value =>
      value === maxValue
        ? documentStyle.getPropertyValue('--cffy-background')
        : documentStyle.getPropertyValue('--cffy-background')
    )
    const pointRadii = visitors.map(value => value === maxValue ? 6 : 4)

    chartData.value.datasets[0].pointBackgroundColor = pointBackgroundColors
    chartData.value.datasets[0].pointBorderColor = pointBorderColors
    chartData.value.datasets[0].pointRadius = pointRadii
    chartData.value.datasets[0].pointHoverRadius = visitors.map(value => value === maxValue ? 8 : 5)
  }

  if (chartTime.value && typeof chartTime.value.refresh === 'function') {
    chartTime.value.refresh()
  }
}

/** Re-theme on color mode change */
function refreshChartTheme() {
  if (!chartData.value) {
    chartData.value = setChartData()
  }

  const previousLabels = [...(chartData.value.labels ?? [])]
  const previousData = [...(chartData.value.datasets[0]?.data ?? [])]

  const themedData = setChartData()
  themedData.labels = previousLabels
  if (themedData.datasets[0]) {
    themedData.datasets[0].data = previousData
  }

  chartData.value = themedData
  chartOptions.value = setChartOptions()
  updateChart()
}
function registerSystemThemeListener() {
  if (!import.meta.client) {
    return
  }

  if (colorMode.value === 'system') {
    if (!systemMediaQuery.value) {
      systemMediaQuery.value = window.matchMedia('(prefers-color-scheme: dark)')
      systemMediaQuery.value.addEventListener('change', handleSystemThemeChange)
    }
  } else {
    unregisterSystemThemeListener()
  }
}
function unregisterSystemThemeListener() {
  if (systemMediaQuery.value) {
    systemMediaQuery.value.removeEventListener('change', handleSystemThemeChange)
    systemMediaQuery.value = null
  }
}
function handleSystemThemeChange() {
  refreshChartTheme()
}
</script>

<template>
  <UiCard
    variant="pane"
  >
    <template #body>
      <div class="analytics-grid">
        <div class="analytics-grid-header">
          <p class="subtitle-2">
            <UiIconMaterial class="fs-xs text-primary iw-bold lh-base me-1" icon-code="&#xef4a;" />
            Visitors
          </p>
        </div>

        <div v-if="isLoading" class="text-center">
          <UiIconMaterial class="text-muted animation-spin me-2" icon-code="&#xe9d0;" />
        </div>
        <UiEmpty
          v-else-if="shouldShowEmptyState"
          title="No visitors data yet"
          subtitle="Traffic metrics will appear once analytics collects activity."
          use-custom-icon
        />
        <ClientOnly v-else>
          <IncludeChartCanvas
            ref="chartTime"
            type="line"
            :data="chartData"
            :options="chartOptions"
            aria-label="Visitors over time line chart"
          />
        </ClientOnly>
      </div>
    </template>
  </UiCard>
</template>
