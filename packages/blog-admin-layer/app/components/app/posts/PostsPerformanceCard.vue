<script setup lang="ts">
import type { IFirestoreDateValue } from '@giancarlosgza/blog-core'
import type { PostAnalyticsMetricKey } from '#admin/shared/types/stats/post'
import { toMillis } from '#admin/app/utils/post-filters'
import { deltaTone, formatDelta, isPostAnalyticsRange, plausiblePageUrl, POST_ANALYTICS_RANGES } from '#admin/shared/utils/post-analytics'

/** Interfaces */
interface IProps {
  slug: string
  isPublished?: boolean
  publishedAt?: IFirestoreDateValue
}
interface IMetricTile {
  key: PostAnalyticsMetricKey
  label: string
  value: string
  delta: string
  tone: string
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  isPublished: false,
  publishedAt: null
})

/** Data */
const selectedMetric = ref<PostAnalyticsMetricKey>('pageviews')
const rangeOptions = POST_ANALYTICS_RANGES.map(value => ({ id: value, text: value.toUpperCase() }))
const metricLabels: Record<PostAnalyticsMetricKey, string> = {
  pageviews: 'Views',
  visitors: 'Visitors',
  visit_duration: 'Avg time',
  bounce_rate: 'Bounce'
}

/** Composables */
const runtimeConfig = useRuntimeConfig()
const { formatDuration } = useStatsFormat()
const { range, data, isLoading, errorMessage, refresh } = usePostAnalytics(toRef(props, 'slug'), toRef(props, 'isPublished'))

/** Computed */
const publishedLabel = computed(() => formatDay(toMillis(props.publishedAt), true))
const tiles = computed<IMetricTile[]>(() => {
  const metrics = data.value?.metrics
  return (Object.keys(metricLabels) as PostAnalyticsMetricKey[]).map((key) => {
    const metric = metrics?.[key]
    return {
      key,
      label: metricLabels[key],
      value: formatMetric(key, metric?.value ?? null),
      delta: formatDelta(metric?.change),
      tone: deltaTone(metric?.change, key === 'bounce_rate')
    }
  })
})
const chartValues = computed(() => (data.value?.timeseries ?? []).map(point => point[selectedMetric.value]))
const chartStart = computed(() => formatDay(dayMillis(data.value?.period.from)))
const chartEnd = computed(() => formatDay(dayMillis(data.value?.period.to)))
const chartLabel = computed(() => `${metricLabels[selectedMetric.value]} per day, ${chartStart.value} to ${chartEnd.value}`)
const sources = computed(() => {
  const rows = data.value?.sources ?? []
  const max = Math.max(1, ...rows.map(row => row.visitors))
  return rows.map(row => ({
    ...row,
    count: formatCount(row.visitors),
    width: row.visitors > 0 ? Math.max(6, Math.round((row.visitors / max) * 100)) : 0
  }))
})
const plausibleUrl = computed(() => (data.value && runtimeConfig.public.plausibleSiteId
  ? plausiblePageUrl(
      String(runtimeConfig.public.plausibleBaseUrlV2 || runtimeConfig.public.plausibleBaseUrl || ''),
      String(runtimeConfig.public.plausibleSiteId),
      `/${props.slug}`,
      data.value.period
    )
  : null))

/** Methods */
function selectRange(value: string | string[] | null): void {
  if (isPostAnalyticsRange(value))
    range.value = value
}
function dayMillis(day: string | undefined): number {
  return day ? Date.parse(`${day}T00:00:00Z`) : 0
}
function formatDay(ms: number, withYear = false): string {
  if (!ms)
    return ''
  const date = new Date(ms)
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear()
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: withYear && !sameYear ? 'numeric' : undefined, timeZone: 'UTC' })
}
function formatCount(value: number | null): string {
  if (value === null)
    return '—'
  return value < 100_000 ? value.toLocaleString('en-US') : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}
function formatMetric(key: PostAnalyticsMetricKey, value: number | null): string {
  if (value === null)
    return '—'
  if (key === 'visit_duration')
    return formatDuration(value)
  if (key === 'bounce_rate')
    return `${Math.round(value)}%`
  return formatCount(value)
}
</script>

<template>
  <UiCard variant="pane">
    <template #header>
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-0">
        <div class="d-grid gap-1">
          <UiSubheadingContent
            title="Performance"
            as="h3"
            gutter="none"
          />
          <p
            v-if="props.isPublished && publishedLabel"
            class="fs-3xs text-muted mb-0"
          >
            Published {{ publishedLabel }}
          </p>
        </div>
        <UiChipGroup
          v-if="props.isPublished"
          :options="rangeOptions"
          :model-value="range"
          variant="outline"
          color="secondary"
          aria-label="Date range"
          @update:model-value="selectRange"
        />
      </div>
    </template>
    <template #body>
      <p
        v-if="!props.isPublished"
        class="fs-3xs text-muted mb-0"
      >
        Analytics appear after publishing.
      </p>

      <div
        v-else-if="errorMessage"
        class="d-grid gap-2"
      >
        <UiAlert
          type="tonal"
          variant="danger"
          size="sm"
          :message="errorMessage"
        />
        <div class="d-flex">
          <UiButton
            variant="outline"
            size="sm"
            text="Retry"
            :loading="isLoading"
            @click="refresh()"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe5d5;" />
            </template>
          </UiButton>
        </div>
      </div>

      <div
        v-else-if="isLoading || !data"
        class="d-grid gap-3"
        role="status"
        aria-label="Loading post analytics"
      >
        <div class="post-kpis">
          <UiBaseSkeleton
            v-for="index in 4"
            :key="`kpi-skeleton-${index}`"
            variant="thumbnail"
            width="100%"
            height="4rem"
          />
        </div>
        <UiBaseSkeleton
          variant="thumbnail"
          width="100%"
          height="4.5rem"
        />
        <div class="d-grid gap-2">
          <UiBaseSkeleton
            v-for="index in 3"
            :key="`source-skeleton-${index}`"
            size="sm"
            :width="`${100 - index * 20}%`"
          />
        </div>
      </div>

      <div
        v-else
        class="d-grid gap-3"
      >
        <div
          class="post-kpis"
          role="group"
          aria-label="Chart metric"
        >
          <button
            v-for="tile in tiles"
            :key="tile.key"
            type="button"
            class="post-kpi"
            :class="{ 'is-selected': selectedMetric === tile.key }"
            :aria-pressed="selectedMetric === tile.key"
            @click="selectedMetric = tile.key"
          >
            <span class="post-kpi-label">{{ tile.label }}</span>
            <span class="post-kpi-value">
              <span>{{ tile.value }}</span>
              <UiBadge
                v-if="tile.delta"
                :variant="`tonal tonal-${tile.tone}`"
                size="sm"
                :text="tile.delta"
              />
            </span>
          </button>
        </div>

        <div class="d-grid gap-1">
          <AppStatsSparkline
            :values="chartValues"
            :height="72"
            area
            :label="chartLabel"
          />
          <div class="d-flex justify-content-between font-code fs-4xs text-muted">
            <span>{{ chartStart }}</span>
            <span>{{ chartEnd }}</span>
          </div>
        </div>

        <UiDivider />

        <div class="d-grid gap-2">
          <p class="fs-3xs fw-600 mb-0">
            Top sources
          </p>
          <ul
            v-if="sources.length"
            class="post-sources"
          >
            <li
              v-for="source in sources"
              :key="source.source"
              :style="`--source-width: ${source.width}%`"
            >
              <span class="text-truncate">{{ source.source }}</span>
              <span class="font-code">{{ source.count }}</span>
            </li>
          </ul>
          <p
            v-else
            class="fs-3xs text-muted mb-0"
          >
            No visits in this range yet.
          </p>
        </div>

        <div
          v-if="plausibleUrl"
          class="d-flex"
        >
          <UiButton
            variant="text"
            size="sm"
            text="Open in Plausible"
            icon-trailing
            :href="plausibleUrl"
            target="_blank"
            rel="noopener"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe89e;" />
            </template>
          </UiButton>
        </div>
      </div>
    </template>
  </UiCard>
</template>
