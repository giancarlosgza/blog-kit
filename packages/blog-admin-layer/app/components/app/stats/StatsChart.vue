<script setup lang="ts">
import type { ChartType } from 'chart.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/** Interfaces */
interface IProps {
  title?: string
  labels?: string[]
  data?: any[]
  dataLabel?: string
  chartType?: ChartType
  chartVariantColor?: string
  height?: number
  isLoading?: boolean | null
  colors?: string[]
  color?: string[]
  circumference?: number
  rotation?: number
  cutout?: string | number
  showTicks?: boolean
  showGridLines?: boolean
  spacing?: number
  borderRadius?: number
  emptyStateTitle?: string
  emptyStateSubtitle?: string
}
interface ChartDataset {
  label: string
  data: number[]
  fill: boolean
  tension: number
  borderWidth: number
  borderJoinStyle: CanvasLineJoin
  borderColor: string | string[]
  backgroundColor: string | string[]
  hoverBorderColor: string | string[]
  hoverBackgroundColor: string | string[]
  showLine: boolean
  indexAxis: 'x' | 'y'
  hoverOffset?: number
  circumference?: number
  rotation?: number
  borderAlign?: 'center' | 'inner'
  cutout?: string | number
  spacing?: number
  borderRadius?: number
}
interface ChartDataShape {
  labels: (string | null | undefined)[]
  datasets: [ChartDataset]
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  labels: () => [],
  data: () => [],
  chartType: 'bar',
  chartVariantColor: 'secondary',
  height: 300,
  isLoading: false,
  colors: () => [],
  showTicks: true,
  showGridLines: true,
  spacing: 0,
  borderRadius: 0,
  emptyStateTitle: 'Sin datos disponibles',
  emptyStateSubtitle: 'Los datos aparecerán una vez que se recopile actividad.'
})

/** Data */
const chartColor = computed(() => {
  const borderColor = `--cffy-${props.chartVariantColor}-a10`
  const backgroundColor = `--cffy-${props.chartVariantColor}-base-fixed`

  return {
    borderColor,
    backgroundColor
  }
})
const chartData = ref<ChartDataShape | null>(null)
const chartOptions = ref()
const chartTime = ref<{ refresh: () => void } | null>(null)
const colorMode = useColorMode()
const systemMediaQuery = ref<MediaQueryList | null>(null)

/** Computed */
const hasStatsData = computed(() => {
  const items = props.data ?? []
  return items.some((n: any) => Number(n ?? 0) !== 0)
})
const shouldShowEmptyState = computed(() => !props.isLoading && !hasStatsData.value)

/** Watch */
watch(() => props.data, () => {
  updateChart()
})
watch(() => colorMode.value, () => {
  if (!import.meta.client) {
    return
  }
  refreshChartTheme()
  registerSystemThemeListener()
}, { immediate: true })

/** Lifecycle */
onMounted(async () => {
  chartData.value = setChartData()
  chartOptions.value = setChartOptions()

  await nextTick()
  updateChart()
  registerSystemThemeListener()
})
onBeforeUnmount(() => {
  unregisterSystemThemeListener()
})

/** Methods */
function isSegmentedChart() {
  return props.chartType === 'pie' || props.chartType === 'doughnut'
}
function normalizeColorString(input: string, docStyle: CSSStyleDeclaration): string {
  if (!input) {
    return input
  }

  const trimmed = input.trim()
  const resolveCssVariable = (value: string): string => {
    if (!value.toLowerCase().startsWith('var(') || !value.endsWith(')')) {
      return ''
    }

    const varName = value.slice(4, -1).trim()
    return docStyle.getPropertyValue(varName).trim()
  }

  // rgb(from var(--token) r g b / alpha)
  if (trimmed.toLowerCase().startsWith('rgb(from') && trimmed.includes('var(')) {
    const varStart = trimmed.indexOf('var(')
    const varEnd = trimmed.indexOf(')', varStart)
    const lastSlash = trimmed.lastIndexOf('/')
    const endParen = trimmed.lastIndexOf(')')

    if (varStart !== -1 && varEnd !== -1 && lastSlash !== -1 && endParen !== -1 && lastSlash < endParen) {
      const source = trimmed.slice(varStart, varEnd + 1).trim()
      const alpha = trimmed.slice(lastSlash + 1, endParen).trim() || '1'
      const resolved = resolveCssVariable(source)
      if (resolved) {
        return `rgb(from ${resolved} r g b / ${alpha})`
      }
    }

    return trimmed
  }

  // rgba(var(--token), alpha)
  if (trimmed.toLowerCase().startsWith('rgba(') && trimmed.includes('var(')) {
    const varStart = trimmed.indexOf('var(')
    const varEnd = trimmed.indexOf(')', varStart)
    if (varStart !== -1 && varEnd !== -1) {
      const varName = trimmed.slice(varStart + 4, varEnd).trim()
      const lastComma = trimmed.lastIndexOf(',')
      const endParen = trimmed.lastIndexOf(')')
      const alpha = lastComma !== -1 && endParen !== -1 ? trimmed.slice(lastComma + 1, endParen).trim() : '1'
      const resolved = docStyle.getPropertyValue(varName).trim()
      if (resolved) {
        return `rgb(from ${resolved} r g b / ${alpha})`
      }
    }
    return trimmed
  }
  // rgb(var(--token))
  if (trimmed.toLowerCase().startsWith('rgb(') && trimmed.includes('var(')) {
    const varStart = trimmed.indexOf('var(')
    const varEnd = trimmed.indexOf(')', varStart)
    if (varStart !== -1 && varEnd !== -1) {
      const varName = trimmed.slice(varStart + 4, varEnd).trim()
      const resolved = docStyle.getPropertyValue(varName).trim()
      if (resolved) {
        return `rgb(from ${resolved} r g b / 1)`
      }
    }
    return trimmed
  }
  // var(--token)
  if (trimmed.toLowerCase().startsWith('var(') && trimmed.endsWith(')')) {
    const resolved = resolveCssVariable(trimmed)
    return resolved || trimmed
  }

  return trimmed
}
function resolveCustomColors(count: number, docStyle: CSSStyleDeclaration): string[] {
  const provided = (props.colors && props.colors.length ? props.colors : (props.color || [])) as string[]
  if (!provided.length) {
    return []
  }
  const normalized = provided
    .map(c => normalizeColorString(c, docStyle))
    .filter((c): c is string => c.length > 0)
  if (normalized.length === count) {
    return normalized
  }

  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const val = normalized[i % Math.max(1, normalized.length)]
    out.push(val as string)
  }
  return out
}
function setChartData(): ChartDataShape {
  const documentStyle = getComputedStyle(document.documentElement)
  const labels = props.labels
  const values = (props.data ?? []).map((n: any) => Number(n ?? 0))
  const segmented = isSegmentedChart()
  const segmentColors = segmented ? resolveCustomColors(values.length, documentStyle) : []

  return {
    labels,
    datasets: [
      {
        label: props.dataLabel ?? 'Data',
        data: values,
        fill: true,
        tension: 0,

        circumference: props.circumference ? props.circumference : undefined,
        rotation: props.rotation ? props.rotation : undefined,
        cutout: props.cutout ? props.cutout : undefined,
        spacing: props.spacing ? props.spacing : undefined,
        borderRadius: props.borderRadius ? props.borderRadius : undefined,

        borderWidth: 3,
        borderJoinStyle: 'round',
        borderColor: segmented && segmentColors.length
          ? segmentColors
          : documentStyle.getPropertyValue(`${chartColor?.value?.borderColor}`),
        backgroundColor: segmented && segmentColors.length
          ? segmentColors
          : `rgb(from ${documentStyle.getPropertyValue(`${chartColor?.value?.backgroundColor}`)} r g b / 0.50)`,
        hoverBorderColor: segmented && segmentColors.length
          ? segmentColors
          : documentStyle.getPropertyValue('--cffy-accent-a10'),
        hoverBackgroundColor: segmented && segmentColors.length
          ? segmentColors
          : `rgb(from ${documentStyle.getPropertyValue('--cffy-accent-base-fixed')} r g b / 1)`,
        showLine: true,
        indexAxis: 'x',
        hoverOffset: 25
      }
    ]
  }
}
function setChartOptions() {
  const documentStyle = getComputedStyle(document.documentElement)
  const textColor = documentStyle.getPropertyValue('--cffy-muted-a10')
  const textColorSecondary = documentStyle.getPropertyValue('--cffy-muted-a10')
  const surfaceBorder = documentStyle.getPropertyValue('--cffy-outline-surface')
  const gridColor = 'transparent'

  return {
    maintainAspectRatio: false,
    aspectRatio: 0.6,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'start',
        labels: {
          color: textColor,
          useBorderRadius: true,
          borderRadius: 5,
          padding: 15
        }
      }
    },
    scales: {
      x: {
        display: props.showGridLines,
        ticks: {
          display: props.showTicks,
          color: textColorSecondary
        },
        grid: {
          display: props.showGridLines,
          lineWidth: 1,
          color: gridColor
        }
      },
      y: {
        display: props.showGridLines,
        ticks: {
          display: props.showTicks,
          color: textColorSecondary
        },
        grid: {
          display: props.showGridLines,
          lineWidth: 1,
          color: surfaceBorder
        }
      }
    },
    layout: {
      padding: 0
    }
  }
}
function updateChart() {
  if (!import.meta.client) {
    return
  }
  if (!chartData.value) {
    chartData.value = setChartData()
  }

  const labels = props.labels ?? []
  const values = (props.data ?? []).map((n: any) => Number(n ?? 0))
  const segmented = isSegmentedChart()
  const documentStyle = getComputedStyle(document.documentElement)
  const segmentColors = segmented ? resolveCustomColors(values.length, documentStyle) : []

  chartData.value.labels = labels

  if (chartData.value.datasets[0]) {
    chartData.value.datasets[0].data = values
    if (segmented) {
      if (segmentColors.length) {
        chartData.value.datasets[0].backgroundColor = segmentColors
        chartData.value.datasets[0].borderColor = segmentColors
        chartData.value.datasets[0].hoverBackgroundColor = segmentColors
        chartData.value.datasets[0].hoverBorderColor = segmentColors
      } else {
        // Fallback to theme-derived colors if no custom colors provided
        chartData.value.datasets[0].backgroundColor = `rgb(from ${documentStyle.getPropertyValue(`${chartColor?.value?.backgroundColor}`)} r g b / 0.50)`
        chartData.value.datasets[0].borderColor = documentStyle.getPropertyValue(`${chartColor?.value?.borderColor}`)
        chartData.value.datasets[0].hoverBackgroundColor = `rgb(from ${documentStyle.getPropertyValue('--cffy-accent-base-fixed')} r g b / 1)`
        chartData.value.datasets[0].hoverBorderColor = documentStyle.getPropertyValue('--cffy-accent-a10')
      }
    }
  }

  if (chartTime.value && typeof chartTime.value.refresh === 'function') {
    nextTick(() => chartTime.value && chartTime.value.refresh())
  }
}

/** Re-theme on color mode change */
function refreshChartTheme() {
  if (!import.meta.client) {
    return
  }
  if (!chartData.value) {
    chartData.value = setChartData()
  }

  const previousLabels = [...chartData.value.labels]
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
  <div>
    <!-- States -->
    <div v-if="props.isLoading" class="text-center">
      <UiIconMaterial class="text-muted animation-spin me-2" icon-code="&#xe9d0;" />
    </div>
    <UiEmpty
      v-else-if="shouldShowEmptyState"
      :title="emptyStateTitle"
      :subtitle="emptyStateSubtitle"
      use-custom-icon
    />

    <!-- Chart -->
    <ClientOnly v-else>
      <IncludeChartCanvas
        ref="chartTime"
        :type="chartType"
        :data="chartData || { labels: [], datasets: [{ label: '', data: [], fill: true, tension: 0, borderWidth: 0, borderJoinStyle: 'round', borderColor: '#000', backgroundColor: '#000', hoverBorderColor: '#000', hoverBackgroundColor: '#000', showLine: true, indexAxis: 'x' }] }"
        :options="chartOptions"
        :height="height"
        aria-label="Stats chart"
      />
      <template #fallback>
        <div class="text-center" />
      </template>
    </ClientOnly>
  </div>
</template>
