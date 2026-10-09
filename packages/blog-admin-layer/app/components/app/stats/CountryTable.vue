<script setup lang="ts">
import { computed } from 'vue'
import { useStatsFormat } from '#admin/app/composables/useStatsFormat'

/** Interfaces */
interface CountryItemRaw {
  country?: string | null
  visitors?: number | null
}
interface IProps {
  stats?: CountryItemRaw[] | null
  isLoading?: boolean | null
  title?: string
}
interface CountryItem {
  id: string
  name: string
  label: string
  visitors: number
  visitorsLabel: string
  widthPercent: number
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  stats: () => [],
  isLoading: false,
  title: 'Top countries'
})

/** Composables */
const { formatCompactNumber } = useStatsFormat()

/** Computed */
const items = computed<CountryItem[]>(() => {
  const raw = (props.stats ?? [])
  const mapped = raw.map((s, idx) => {
    const name = (s?.country ?? 'Unknown country').toString()
    const visitors = sanitizeVisitors(s?.visitors)
    return {
      id: `country-${idx}`,
      name,
      label: name,
      visitors,
      visitorsLabel: formatCompactNumber(visitors, { fallback: '0' }),
      widthPercent: 0
    }
  })

  const maxVisitors = Math.max(1, ...mapped.map(i => i.visitors))
  const MIN_BAR = 6

  for (const item of mapped) {
    const pct = (item.visitors / maxVisitors) * 100
    const clamped = item.visitors > 0 ? Math.max(MIN_BAR, Math.min(100, pct)) : 0
    item.widthPercent = Math.round(clamped)
  }

  return mapped
})
const hasRows = computed(() => items.value.length > 0)

/** Methods */
function sanitizeVisitors(value: number | null | undefined): number {
  const visitors = Number(value ?? 0)
  if (!Number.isFinite(visitors)) {
    return 0
  }
  return Math.max(0, visitors)
}
</script>

<template>
  <UiCard
    variant="pane"
    class="h-100"
  >
    <template #body>
      <div class="analytics-grid">
        <div class="analytics-grid-header">
          <p class="subtitle-2">
            <UiIconMaterial
              icon-code="&#xef4a;"
              class="fs-xs text-success iw-bold lh-base me-1"
            />
            Top {{ stats?.length }} countries
          </p>
          <p class="subtitle-2">
            Unique visitors
          </p>
        </div>

        <!-- Loading state -->
        <div
          v-if="isLoading"
          class="text-center"
        >
          <UiIconMaterial
            class="text-muted animation-spin me-2"
            icon-code="&#xe9d0;"
          />
        </div>

        <!-- Data rows -->
        <template v-else-if="hasRows">
          <div
            v-for="item in items"
            :id="item.id"
            :key="item.id"
            :style="`--stat-width: ${item.widthPercent}%`"
            class="analytics-grid-item"
            :title="`Country: ${item.label}`"
          >
            <p class="subtitle-2">
              {{ item.label }}
            </p>
            <p class="subtitle-2">
              {{ item.visitorsLabel }}
            </p>
          </div>
        </template>

        <!-- Empty state -->
        <UiEmpty
          v-else
          title="No country data"
          subtitle="Country data will appear once visitors arrive."
          use-custom-icon
        />
      </div>
    </template>
  </UiCard>
</template>
