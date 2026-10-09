<script setup lang="ts">
import type { AggregateStats } from '#admin/shared/types/stats/aggregate'
import { computed } from 'vue'
import { useStatsFormat } from '#admin/app/composables/useStatsFormat'

/** Interfaces */
interface IProps {
  stats?: AggregateStats | null
  realtime?: number | null
  isLoading?: boolean | null
}
interface ChangeMeta {
  formatted: string
  className: string
  iconCode?: string
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  stats: null,
  realtime: 0,
  isLoading: false
})

/** Data */
const realtimeCardStyle: Record<string, string> = { '--base-color': '#009f42' }
const pageviewsCardStyle: Record<string, string> = { '--base-color': '#E48757' }
const bounceRateCardStyle: Record<string, string> = { '--base-color': '#b41c2b' }
const visitDurationCardStyle: Record<string, string> = { '--base-color': '#0075d6' }

/** Composables */
const { formatCompactNumber, formatDuration } = useStatsFormat()

/** Computed */
const hasStats = computed(() => Boolean(props.stats))
const realtimeVisitors = computed(() => Number(props.realtime ?? 0))
const visitorsCount = computed(() => props.stats?.visitors?.value ?? 0)
const pageviewsCount = computed(() => props.stats?.pageviews?.value ?? 0)
const bounceRateValue = computed(() => props.stats?.bounce_rate?.value ?? 0)
const visitDurationSeconds = computed(() => props.stats?.visit_duration?.value ?? 0)

const visitorsChangeMeta = computed(() => createChangeMeta(props.stats?.visitors?.change))
const pageviewsChangeMeta = computed(() => createChangeMeta(props.stats?.pageviews?.change))
const bounceRateChangeMeta = computed(() => createChangeMeta(props.stats?.bounce_rate?.change))
const visitDurationChangeMeta = computed(() => createChangeMeta(props.stats?.visit_duration?.change))

const formattedRealtimeVisitors = computed(() => formatCompactNumber(realtimeVisitors.value, { fallback: '0' }))
const formattedUniqueVisitors = computed(() => formatCompactNumber(visitorsCount.value, { fallback: '0' }))
const formattedPageviews = computed(() => formatCompactNumber(pageviewsCount.value, { fallback: '0' }))
const formattedVisitDuration = computed(() => formatDuration(visitDurationSeconds.value, { fallback: '0s' }))

/** Methods */
function createChangeMeta(change: number | null | undefined): ChangeMeta | null {
  if (change === null || change === undefined) {
    return null
  }

  const numericChange = Number(change)
  if (!Number.isFinite(numericChange)) {
    return null
  }

  const formatter = new Intl.NumberFormat('en', {
    maximumFractionDigits: Math.abs(numericChange) < 1 ? 2 : 1,
    minimumFractionDigits: 0
  })

  const prefix = numericChange > 0 ? '+' : numericChange < 0 ? '-' : ''
  const formatted = `${prefix}${formatter.format(Math.abs(numericChange))}%`
  const className = numericChange > 0 ? 'text-success-fixed' : numericChange < 0 ? 'text-danger-fixed' : 'text-muted'
  const iconCode = numericChange > 0
    ? '&#xe8e5;'
    : numericChange < 0
      ? '&#xe8e3;'
      : '&#xe8e4;'

  return { formatted, className, iconCode }
}
</script>

<template>
  <div
    v-if="hasStats"
    class="d-grid grid-repeat-cols-2 grid-repeat-cols-md-3 grid-repeat-cols-xxl-5 gap-3 mb-3"
  >
    <!-- Realtime -->
    <UiCard
      variant="pane"
      class="card-stat"
      :style="realtimeCardStyle"
    >
      <template #body>
        <div>
          <UiIconMaterial icon-code="&#xea03;" class="lead-icon" />
        </div>
        <div
          class="stats-content"
          aria-live="polite"
        >
          <p class="subtitle-2">
            Realtime visitors
          </p>

          <UiBaseSkeleton v-if="isLoading" size="md" width="100%" />
          <p
            v-else
            :title="`${formattedRealtimeVisitors} visitors`"
            class="subtitle-1 tabular-numbers"
          >
            {{ formattedRealtimeVisitors }}
            <span class="">
              <UiIconMaterial
                icon-code="&#xef4a;"
                title="Live"
                class="fs-2xs text-success iw-bold animation-pulse-shadow"
              />
            </span>
          </p>
        </div>
      </template>
    </UiCard>

    <!-- Visitors -->
    <UiCard
      variant="pane"
      class="card-stat"
    >
      <template #body>
        <div>
          <UiIconMaterial icon-code="&#xe01d;" class="lead-icon" />
        </div>
        <div class="stats-content">
          <p class="subtitle-2">
            Unique visitors
          </p>

          <UiBaseSkeleton v-if="isLoading" size="md" width="100%" />
          <p
            v-else
            :title="`${formattedUniqueVisitors} visitors`"
            class="subtitle-1 tabular-numbers"
          >
            {{ formattedUniqueVisitors }}
            <span
              v-if="visitorsChangeMeta"
              class="subtitle-2"
              :class="visitorsChangeMeta.className"
            >
              <UiIconMaterial
                v-if="visitorsChangeMeta.iconCode"
                :icon-code="visitorsChangeMeta.iconCode"
                class="fs-sm"
              />
              {{ visitorsChangeMeta.formatted }}
            </span>
          </p>
        </div>
      </template>
    </UiCard>

    <!-- Pageviews -->
    <UiCard
      variant="pane"
      class="card-stat"
      :style="pageviewsCardStyle"
    >
      <template #body>
        <div>
          <UiIconMaterial icon-code="&#xe4fc;" class="lead-icon" />
        </div>
        <div class="stats-content">
          <p class="subtitle-2">
            Total pageviews
          </p>

          <UiBaseSkeleton v-if="isLoading" size="md" width="100%" />
          <p
            v-else
            :title="`${formattedPageviews} pageviews`"
            class="subtitle-1 tabular-numbers"
          >
            {{ formattedPageviews }}
            <span
              v-if="pageviewsChangeMeta"
              class="subtitle-2"
              :class="pageviewsChangeMeta.className"
            >
              <UiIconMaterial
                v-if="pageviewsChangeMeta.iconCode"
                :icon-code="pageviewsChangeMeta.iconCode"
                class="fs-sm"
              />
              {{ pageviewsChangeMeta.formatted }}
            </span>
          </p>
        </div>
      </template>
    </UiCard>

    <!-- Bounce rate -->
    <UiCard
      variant="pane"
      class="card-stat"
      :style="bounceRateCardStyle"
    >
      <template #body>
        <div>
          <UiIconMaterial icon-code="&#xe879;" class="lead-icon" />
        </div>
        <div class="stats-content">
          <p class="subtitle-2">
            Bounce rate
          </p>
          <UiBaseSkeleton v-if="isLoading" size="md" width="100%" />

          <p
            v-else
            :title="`${bounceRateValue ?? 0}% bounce rate`"
            class="subtitle-1 tabular-numbers"
          >
            {{ bounceRateValue ?? 0 }}%
            <span
              v-if="bounceRateChangeMeta"
              class="subtitle-2"
              :class="bounceRateChangeMeta.className"
            >
              <UiIconMaterial
                v-if="bounceRateChangeMeta.iconCode"
                :icon-code="bounceRateChangeMeta.iconCode"
                class="fs-sm"
              />
              {{ bounceRateChangeMeta.formatted }}
            </span>
          </p>
        </div>
      </template>
    </UiCard>

    <!-- Visit duration -->
    <UiCard
      variant="pane"
      class="card-stat grid-span-col-2 grid-span-col-xxl-1"
      :style="visitDurationCardStyle"
    >
      <template #body>
        <div>
          <UiIconMaterial icon-code="&#xe425;" class="lead-icon" />
        </div>
        <div class="stats-content">
          <p class="subtitle-2">
            Visit duration
          </p>

          <UiBaseSkeleton v-if="isLoading" size="md" width="100%" />
          <p
            v-else
            :title="`${visitDurationSeconds ?? 0}s visit duration`"
            class="subtitle-1 tabular-numbers"
          >
            {{ formattedVisitDuration }}
            <span
              v-if="visitDurationChangeMeta"
              class="subtitle-2"
              :class="visitDurationChangeMeta.className"
            >
              <UiIconMaterial
                v-if="visitDurationChangeMeta.iconCode"
                :icon-code="visitDurationChangeMeta.iconCode"
                class="fs-sm"
              />
              {{ visitDurationChangeMeta.formatted }}
            </span>
          </p>
        </div>
      </template>
    </UiCard>
  </div>
</template>
