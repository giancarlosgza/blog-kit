<script setup lang="ts">
import { computed } from 'vue'
import { useStatsFormat } from '#admin/app/composables/useStatsFormat'

/** Interfaces */
interface ReferralLandingItemRaw {
  source?: string | null
  entryPage?: string | null
  visitors?: number | null
}
interface IProps {
  stats?: ReferralLandingItemRaw[] | null
  isLoading?: boolean | null
  title?: string
}
interface ReferralLandingItem {
  id: string
  source: string
  entryPage: string
  label: string
  visitors: number
  visitorsLabel: string
  widthPercent: number
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  stats: () => [],
  isLoading: false,
  title: 'Top entry journeys'
})

/** Composables */
const { formatCompactNumber } = useStatsFormat()

/** Computed */
const items = computed<ReferralLandingItem[]>(() => {
  const raw = (props.stats ?? [])
  const mapped = raw.map((s, idx) => {
    const source = s?.source || 'Direct / None'
    const entryPage = s?.entryPage || '/'
    const label = `${source} ➔ ${entryPage}`
    const visitors = sanitizeVisitors(s?.visitors)
    return {
      id: `ref-land-${idx}`,
      source,
      entryPage,
      label,
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
  >
    <template #body>
      <div class="analytics-grid">
        <div class="analytics-grid-header">
          <p class="subtitle-2">
            <UiIconMaterial
              icon-code="&#xef4a;"
              class="fs-xs text-warning iw-bold lh-base me-1"
            />
            {{ title }}
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
            :title="`Journey: ${item.label}`"
          >
            <p class="subtitle-2 text-truncate d-flex align-items-center gap-1">
              <span class="text-muted">{{ item.source }}</span>
              <UiIconMaterial icon-code="&#xe941;" class="text-muted fs-sm" />
              <span>{{ item.entryPage }}</span>
            </p>
            <p class="subtitle-2">
              {{ item.visitorsLabel }}
            </p>
          </div>
        </template>

        <!-- Empty state -->
        <UiEmpty
          v-else
          title="No entry journeys"
          subtitle="Journey data will appear once referred visitors land."
          use-custom-icon
        />
      </div>
    </template>
  </UiCard>
</template>
