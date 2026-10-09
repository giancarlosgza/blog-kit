<script setup lang="ts">
import type { BreakdownStats } from '#admin/shared/types/stats/breakdown'
import { computed } from 'vue'
import { useStatsFormat } from '#admin/app/composables/useStatsFormat'

/** Interfaces */
interface IProps {
  stats?: BreakdownStats[] | null
  isLoading?: boolean | null
}
interface BreakdownItem {
  id: string
  page: string
  pageLabel: string
  visitors: number
  visitorsLabel: string
  hasPath: boolean
  widthPercent: number
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  stats: () => [],
  isLoading: false
})

/** Composables */
const runtimeConfig = useRuntimeConfig()
const { blogUrl } = useBlogUrl()
const { formatCompactNumber } = useStatsFormat()

/** Constants */
const regexTrailingSlash = /\/$/

/** Computed */
// Plausible dashboard origin and site
const analyticsOrigin = computed(() => {
  try {
    return new URL(String(runtimeConfig.public.plausibleBaseUrlV2 || runtimeConfig.public.plausibleBaseUrl)).origin
  } catch {
    return ''
  }
})
const analyticsSite = computed(() => String(runtimeConfig.public.plausibleSiteId || ''))
const siteBaseUrl = computed(() => blogUrl)
const items = computed<BreakdownItem[]>(() => {
  const rawItems = (props.stats ?? []).map((stat, index) => {
    const rawPage = stat?.page ?? ''
    const hasPath = Boolean(rawPage)
    const normalizedPage = hasPath && rawPage ? (rawPage.startsWith('/') ? rawPage : `/${rawPage}`) : '/'
    const pageLabel = hasPath ? normalizedPage : 'Unknown page'
    const visitors = sanitizeVisitors(stat?.visitors)

    return {
      id: `breakdown-${index}`,
      page: normalizedPage,
      pageLabel,
      visitors,
      visitorsLabel: formatCompactNumber(visitors, { fallback: '0' }),
      hasPath,
      widthPercent: 0
    }
  })

  const maxVisitors = Math.max(1, ...rawItems.map(i => i.visitors))
  const MIN_BAR = 6

  for (const item of rawItems) {
    const pct = (item.visitors / maxVisitors) * 100
    const clamped = item.visitors > 0 ? Math.max(MIN_BAR, Math.min(100, pct)) : 0
    item.widthPercent = Math.round(clamped)
  }

  return rawItems
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
function buildAnalyticsUrl(path: string): string {
  if (!analyticsOrigin.value || !analyticsSite.value)
    return ''
  return `${analyticsOrigin.value}/${encodeURIComponent(analyticsSite.value)}?page=${encodeURIComponent(path)}`
}
function buildSiteUrl(path: string): string {
  const trimmedBase = siteBaseUrl.value.replace(regexTrailingSlash, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${trimmedBase}${normalizedPath}`
}
function openDetails(path: string | null | undefined) {
  const url = path ? buildAnalyticsUrl(path) : ''
  if (!url) {
    return
  }
  navigateTo(
    url,
    {
      external: true,
      open: {
        target: '_blank',
        windowFeatures: {
          noopener: true
        }
      }
    }
  )
}
function openWebPage(path: string | null | undefined) {
  if (!path) {
    return
  }
  navigateTo(
    buildSiteUrl(path),
    {
      external: true,
      open: {
        target: '_blank',
        windowFeatures: {
          noopener: true
        }
      }
    }
  )
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
              class="fs-xs text-success iw-bold lh-base me-1"
            />
            Top {{ stats?.length }} pages
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
            :title="`Double click to view analytics for ${item.pageLabel}`"
            @dblclick="openDetails(item.hasPath ? item.page : null)"
          >
            <UiButton
              variant="filled"
              color="primary"
              icon icon-variant="compact"
              class="shape-md"
              :aria-label="`Open ${item.pageLabel} in a new tab`"
              :title="`Open ${item.pageLabel} on site`"
              :disabled="!item.hasPath"
              @click="openWebPage(item.hasPath ? item.page : null)"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe89e;" />
              </template>
            </UiButton>
            <p class="subtitle-2">
              {{ item.pageLabel }}
            </p>
            <p class="subtitle-2">
              {{ item.visitorsLabel }}
            </p>
          </div>
        </template>

        <!-- Empty state -->
        <UiEmpty
          v-else
          title="No page data"
          subtitle="Breakdown data will appear once visitors explore your pages."
          use-custom-icon
        />
      </div>
    </template>
  </UiCard>
</template>
