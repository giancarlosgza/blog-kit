<script setup lang="ts">
import type { Chart, ChartData, ChartOptions, ChartType, Plugin } from 'chart.js'

/** Interfaces */
interface IChartCanvasProps {
  type: ChartType
  data: ChartData
  options?: ChartOptions
  plugins?: Plugin[]
  width?: number
  height?: number
  ariaLabel?: string
}

/** Props */
const props = withDefaults(defineProps<IChartCanvasProps>(), {
  options: () => ({}),
  plugins: () => [],
  width: 300,
  height: 150,
  ariaLabel: undefined
})

/** Data */
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const chart = shallowRef<Chart | null>(null)
let renderId = 0

/** Watch */
watch(() => props.type, () => renderChart())
watch([() => props.data, () => props.options], () => {
  if (!chart.value)
    return

  chart.value.data = toRaw(props.data)
  chart.value.options = toRaw(props.options)
  chart.value.update()
}, { deep: true })

/** Lifecycle */
onMounted(() => renderChart())
onBeforeUnmount(() => {
  renderId++
  destroyChart()
})

/** Methods */
async function renderChart() {
  const id = ++renderId
  const { default: ChartJs } = await import('chart.js/auto')

  if (id !== renderId || !canvas.value)
    return

  destroyChart()
  chart.value = new ChartJs(canvas.value, {
    type: props.type,
    data: toRaw(props.data),
    options: toRaw(props.options),
    plugins: props.plugins
  })
}
function destroyChart() {
  chart.value?.destroy()
  chart.value = null
}
function refresh() {
  chart.value?.update()
}

defineExpose({
  refresh,
  getChart: () => chart.value,
  getCanvas: () => canvas.value
})
</script>

<template>
  <div class="chart-canvas">
    <canvas
      ref="canvas"
      :width="width"
      :height="height"
      role="img"
      :aria-label="ariaLabel"
    />
  </div>
</template>
