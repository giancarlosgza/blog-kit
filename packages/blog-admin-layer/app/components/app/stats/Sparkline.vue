<script setup lang="ts">
/** Interfaces */
interface IProps {
  values?: number[] | null
  height?: number
  area?: boolean
  label?: string | null
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  values: () => [],
  height: 24,
  area: false,
  label: null
})

/** Data */
const width = 100
const inset = 2

/** Computed */
const points = computed(() => {
  const values = (props.values ?? []).map(value => (Number.isFinite(value) ? Math.max(0, value) : 0))
  if (!values.length)
    return []
  const series = values.length === 1 ? [values[0]!, values[0]!] : values
  const max = Math.max(...series) || 1
  const step = width / (series.length - 1)
  return series.map((value, index) => [index * step, props.height - inset - (value / max) * (props.height - inset * 2)] as const)
})
const linePath = computed(() => points.value.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' '))
const areaPath = computed(() => (points.value.length ? `${linePath.value} L${width} ${props.height} L0 ${props.height} Z` : ''))
</script>

<template>
  <svg
    v-if="points.length"
    class="sparkline"
    :class="{ 'is-area': props.area }"
    :viewBox="`0 0 ${width} ${props.height}`"
    :height="props.height"
    preserveAspectRatio="none"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label || undefined"
    :aria-hidden="props.label ? undefined : 'true'"
  >
    <path
      v-if="props.area"
      class="sparkline-area"
      :d="areaPath"
    />
    <path
      class="sparkline-line"
      :d="linePath"
    />
  </svg>
</template>
