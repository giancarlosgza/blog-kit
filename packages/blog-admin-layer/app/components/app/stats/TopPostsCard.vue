<script setup lang="ts">
import { deltaTone, formatDelta, isPostAnalyticsRange, POST_ANALYTICS_RANGES, rangeDays } from '#admin/shared/utils/post-analytics'
import { NuxtLink } from '#components'

/** Data */
const rangeOptions = POST_ANALYTICS_RANGES.map(value => ({ id: value, text: value.toUpperCase() }))

/** Composables */
const { range, data, isLoading, errorMessage, refresh } = useTopPosts()

/** Computed */
const subtitle = computed(() => `By views, vs the previous ${rangeDays(range.value)} days`)
const rows = computed(() => (data.value?.posts ?? []).map((post, index) => ({
  ...post,
  rank: String(index + 1).padStart(2, '0'),
  date: formatDay(post.createdAt),
  viewsLabel: post.views < 100_000 ? post.views.toLocaleString('en-US') : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(post.views),
  delta: formatDelta(post.change),
  tone: deltaTone(post.change),
  thumbStyle: post.color ? `--_top-post-color: ${post.color}` : undefined
})))

/** Methods */
function formatDay(ms: number | null): string {
  if (!ms)
    return ''
  const date = new Date(ms)
  const year = date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year })
}
function selectRange(value: string | string[] | null): void {
  if (isPostAnalyticsRange(value))
    range.value = value
}
</script>

<template>
  <UiCard variant="pane">
    <template #header>
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-0">
        <div class="d-grid gap-1">
          <UiSubheadingContent
            title="Top posts"
            as="h3"
            gutter="none"
          />
          <p class="fs-3xs text-muted mb-0">
            {{ subtitle }}
          </p>
        </div>
        <UiChipGroup
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
      <div class="d-grid gap-3">
        <div
          v-if="errorMessage"
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
          class="d-grid gap-1"
          role="status"
          aria-label="Loading top posts"
        >
          <div
            v-for="index in 5"
            :key="`top-post-skeleton-${index}`"
            class="top-post"
          >
            <UiBaseSkeleton
              size="sm"
              width="1.25rem"
            />
            <UiBaseSkeleton
              variant="thumbnail"
              width="2.25rem"
              height="2.25rem"
            />
            <span class="d-grid gap-1">
              <UiBaseSkeleton
                size="sm"
                :width="`${90 - index * 8}%`"
              />
              <UiBaseSkeleton
                size="sm"
                width="4rem"
              />
            </span>
          </div>
        </div>

        <UiEmpty
          v-else-if="!rows.length"
          title="No post views yet"
          subtitle="Published posts show up here once readers visit them."
          use-custom-icon
          icon-code="&#xef42;"
        />

        <ol
          v-else
          class="top-posts"
        >
          <li
            v-for="post in rows"
            :key="post.slug"
          >
            <NuxtLink
              :to="`/posts/${post.slug}`"
              class="top-post undecorated"
            >
              <span class="font-code fs-3xs text-muted">{{ post.rank }}</span>
              <img
                v-if="post.imageURL"
                :src="post.imageURL"
                alt=""
                class="top-post-thumb"
                loading="lazy"
              >
              <span
                v-else
                class="top-post-thumb"
                :style="post.thumbStyle"
              />
              <span class="top-post-text">
                <span class="top-post-title">{{ post.title }}</span>
                <span class="font-code fs-4xs text-muted">{{ post.date }}</span>
              </span>
              <AppStatsSparkline
                v-if="post.series.length"
                :values="post.series"
                :height="24"
                class="top-post-spark"
              />
              <span class="top-post-views">
                <span class="font-code fs-3xs">{{ post.viewsLabel }}</span>
                <UiBadge
                  v-if="post.delta"
                  :variant="`tonal tonal-${post.tone}`"
                  size="sm"
                  :text="post.delta"
                />
              </span>
            </NuxtLink>
          </li>
        </ol>

        <div class="d-flex">
          <UiButton
            variant="text"
            size="sm"
            text="View all posts"
            icon-trailing
            :as="NuxtLink"
            to="/posts"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe5cc;" />
            </template>
          </UiButton>
        </div>
      </div>
    </template>
  </UiCard>
</template>
