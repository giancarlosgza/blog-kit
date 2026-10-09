<script setup lang="ts">
import type { BrandIcon } from '#admin/app/utils/brand-icons'
import type { DateRangePeriod } from '#admin/shared/types/stats/date-range'
import { getBrandIcon, getBrandIconClass } from '#admin/app/utils/brand-icons'
import { NuxtLink } from '#components'

/** Interfaces */
type ExternalToolType = 'payments' | 'ads' | 'console' | 'analytics' | 'blog'
interface DashboardModule {
  name: string
  path: string
  description: string
  icon: string
}
interface ExternalToolLink {
  name: string
  type: ExternalToolType
  url: string
  description: string
  icon?: BrandIcon | string
}
interface DateRangeOption {
  label: string
  value: DateRangePeriod
}

/** Head */
const runtimeConfig = useRuntimeConfig()
const { blogName } = useAppConfig().admin
const { blogUrl } = useBlogUrl()
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined

definePageMeta({
  pageTitle: 'Dashboard',
  middleware: ['auth']
})
useSeoMeta({
  title: 'Dashboard',
  description: `${blogName} admin dashboard.`,
  ogTitle: 'Dashboard',
  ogDescription: `${blogName} admin dashboard.`,
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Dashboard',
  twitterDescription: `${blogName} admin dashboard.`,
  twitterCard: 'summary'
})
useHead({
  link: [
    {
      rel: 'canonical',
      href: siteUrl ? `${siteUrl}${route.path}` : route.path
    }
  ]
})

/** Data */
const currentPeriod = ref<DateRangePeriod>('30d')
const {
  isLoading,
  error,
  breakdownStats,
  browserBreakdown,
  referrerBreakdown,
  aggregateStats,
  timeStats,
  realtimeStats,
  channelBreakdown,
  countryBreakdown,
  referralLandingBreakdown,
  refresh: refreshStats
} = useAnalyticsStats(currentPeriod)

const modules: DashboardModule[] = [
  {
    name: 'posts',
    path: '/posts',
    description: 'Create, edit and publish your blog articles.',
    icon: '&#xef42;'
  },
  {
    name: 'authors',
    path: '/authors',
    description: 'Manage author profiles, avatars and bios.',
    icon: '&#xe7ef;'
  },
  {
    name: 'tags',
    path: '/tags',
    description: 'Create and manage the tags used to organize posts.',
    icon: '&#xe892;'
  },
  {
    name: 'settings',
    path: '/settings',
    description: 'Configure blog name, branding and colors.',
    icon: '&#xe8b8;'
  },
  {
    name: 'new post',
    path: '/posts/new',
    description: 'Start writing a brand new article.',
    icon: '&#xe145;'
  }
]
// Console links from env
const firebaseProjectId = String(runtimeConfig.public.vuefire?.config?.projectId || '')
const blogHostname = (() => {
  try {
    return new URL(blogUrl).hostname
  } catch {
    return ''
  }
})()
const externalTools: ExternalToolLink[] = [
  {
    name: blogName,
    type: 'blog',
    url: blogUrl,
    description: `View the public ${blogName}.`,
    icon: 'blog'
  },
  ...(firebaseProjectId
    ? [{
        name: 'Firebase Console',
        type: 'console' as const,
        url: `https://console.firebase.google.com/u/0/project/${firebaseProjectId}/overview`,
        description: 'Manage backend services and databases.',
        icon: 'firebase'
      }]
    : []),
  ...(blogHostname
    ? [{
        name: 'Search Console',
        type: 'console' as const,
        url: `https://search.google.com/search-console?resource_id=sc-domain:${blogHostname}`,
        description: 'Monitor search visibility and indexing.',
        icon: 'google'
      }]
    : [])
]

const dateRange = ref<DateRangeOption[]>([
  {
    label: 'Today',
    value: 'day'
  },
  {
    label: 'Last 7 days',
    value: '7d'
  },
  {
    label: 'Last 30 days',
    value: '30d'
  },
  {
    label: 'Last month',
    value: 'month'
  },
  {
    label: 'Last 6 months',
    value: '6mo'
  },
  {
    label: 'Last 12 months',
    value: '12mo'
  },
  {
    label: 'All time',
    value: 'all'
  }
])
</script>

<template>
  <div class="container-fluid mb-5">
    <!-- Header -->
    <UiHeaderContent
      title="Dashboard"
      subtitle="Write boldly. Publish beautifully."
      view-transition-name="selected-headline"
    >
      <template #actions>
        <UiButtonGroup class="align-items-center">
          <UiInputCombobox
            id="date-range-select"
            v-model="currentPeriod"
            label="Date range"
            hide-label
            placeholder="Select a date range"
            option-label="label"
            option-value="value"
            :options="dateRange"
            size="sm"
            class="mb-0"
          />
          <UiButton
            text="Refresh"
            variant="filled"
            color="primary"
            rounded
            @click="refreshStats()"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe5d5;" />
            </template>
          </UiButton>
        </UiButtonGroup>
      </template>
    </UiHeaderContent>

    <!-- Error -->
    <UiAlert
      v-if="error"
      :message="error ?? 'Something went wrong'"
      type="tonal"
      variant="danger"
      size="sm"
      custom-class="alert-contrast"
    />

    <!-- Stats -->
    <AppStatsAggregateCards
      :stats="aggregateStats"
      :realtime="realtimeStats"
      :is-loading="isLoading"
    />

    <div class="d-grid grid-repeat-cols-xl-2 gap-3 mt-section">
      <!-- Time visitors chart -->
      <div>
        <AppStatsTimeChart
          :stats="timeStats"
          :is-loading="isLoading"
        />
      </div>

      <!-- Breakdown top pages -->
      <div>
        <AppStatsBreakdownTable
          :stats="breakdownStats"
          :is-loading="isLoading"
        />
      </div>
    </div>

    <!-- Top posts -->
    <div class="mt-section">
      <AppStatsTopPostsCard />
    </div>

    <div class="d-grid grid-repeat-cols-md-2 grid-repeat-cols-xl-3 gap-3 mt-section">
      <!-- Bounce rate chart -->
      <div>
        <AppStatsBounceRateChart
          :stats="aggregateStats.bounce_rate"
          :is-loading="isLoading"
        />
      </div>

      <!-- Browsers donut -->
      <div>
        <AppStatsBrowserDonut
          :stats="browserBreakdown"
          :is-loading="isLoading"
        />
      </div>

      <!-- Traffic Channels donut -->
      <div>
        <AppStatsChannelDonut
          :stats="channelBreakdown"
          :is-loading="isLoading"
        />
      </div>

      <!-- Referrers table -->
      <div>
        <AppStatsReferrerTable
          :stats="referrerBreakdown"
          :is-loading="isLoading"
        />
      </div>

      <!-- Countries table -->
      <div>
        <AppStatsCountryTable
          :stats="countryBreakdown"
          :is-loading="isLoading"
        />
      </div>

      <!-- Referral landing paths table -->
      <div>
        <AppStatsReferralLandingTable
          :stats="referralLandingBreakdown"
          :is-loading="isLoading"
        />
      </div>
    </div>

    <!-- Modules -->
    <div class="row mt-section mt-section-lg">
      <div class="col-md-12 mb-3">
        <UiIconShapes shape="blob-5" size="sm" class="mb-3" />
        <UiSubheadingContent as="h2" title="Modules" />
      </div>
      <div class="d-grid grid-repeat-cols-md-3 grid-repeat-cols-xl-4 gap-3 mb-3">
        <UiCard
          v-for="(module, indexModule) in modules"
          :key="`module-${indexModule}`"
          variant="pane"
          class="h-100"
          :to="module.path"
          :as="NuxtLink"
        >
          <template #body>
            <UiIconMaterial
              class="icon-wrap icon-wrap-sm icon-wrap-outline h-auto mb-3"
              :icon-code="module.icon"
            />
            <p
              class="subtitle-1 fw-600 fl-capitalize mb-1"
              v-text="module.name"
            />
            <p
              class="subtitle-2 text-muted mb-0"
              v-text="module.description"
            />
          </template>
        </UiCard>
      </div>
    </div>

    <!-- Integrations tools -->
    <div class="row mt-section mt-section-lg mb-5">
      <div class="col-md-12 mb-3">
        <UiIconShapes shape="blob-6" size="sm" class="mb-3" />
        <UiSubheadingContent as="h2" title="Integrations" />
      </div>
      <div class="d-grid grid-repeat-cols-md-3 grid-repeat-cols-xl-4 gap-3">
        <UiCard
          v-for="(tool, indexTool) in externalTools"
          :key="`tool-${indexTool}`"
          variant="pane"
          :href="tool.url"
          class="h-100"
        >
          <template #body>
            <IncludeAppLogo
              v-if="tool.type === 'blog'"
              type="icon"
              :width="32"
              :height="32"
              class="mb-3"
            />
            <UiIconSvg
              v-else
              :content="getBrandIcon(tool.icon)"
              :class="getBrandIconClass(tool.icon)"
              class="mb-3"
            />
            <p
              class="subtitle-1 fw-600 fl-capitalize mb-1"
              v-text="tool.name"
            />
            <p
              class="subtitle-2 text-muted mb-0"
              v-text="tool.description"
            />
          </template>
        </UiCard>
      </div>
    </div>
  </div>
</template>
