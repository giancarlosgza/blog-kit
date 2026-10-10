<script setup lang="ts">
import type { IPost } from '@giancarlosgza/blog-core'

/** Interfaces */
interface IProps {
  post: IPost
  featured?: boolean
  badge?: string
  badgeIcon?: string
  showSeries?: boolean
  isSkeleton?: boolean
  headingTag?: 'h2' | 'h3'
}

/** Props */
const {
  post,
  featured = false,
  badge = '',
  badgeIcon = '',
  showSeries = true,
  isSkeleton = false,
  headingTag = 'h2'
} = defineProps<IProps>()

/** Constants */
const MAX_TAGS = 2
const MAX_FEATURED_TAGS = 3

/** Composables */
const { blogPath } = useBlogPath()
const { formatDateValue, normalizeDateValue } = useDateValue()
const brand = useAppConfig().blog
const { seriesName } = useSeriesNames()
const { t } = useBlogLabels()
const activePost = useState<string | null>('activePost', () => null)

/** Computed */
const slug = computed(() => post.slug || post.id || '')
const authorName = computed(() => resolveAuthorName(post, brand.defaultAuthor))
const authorInitial = computed(() => authorName.value.charAt(0).toUpperCase())
const publishedLabel = computed(() => formatDateValue(post.createdAt))
const publishedIso = computed(() => {
  const published = normalizeDateValue(post.createdAt)
  return published ? new Date(published).toISOString() : undefined
})
const series = computed(() => {
  const name = showSeries ? seriesName(post.seriesSlug) : null
  return name ? { name, to: blogPath(`/series/${post.seriesSlug}`) } : null
})
const badgeText = computed(() => badge || (featured ? t('featured') : ''))
const badgeIconCode = computed(() => (badge ? badgeIcon || undefined : '&#xf525;'))
const displayedTags = computed(() => post.tags?.slice(0, featured ? MAX_FEATURED_TAGS : MAX_TAGS) ?? [])
const isTransitionTarget = computed(() => activePost.value === slug.value)

/** Methods */
function markActive(): void {
  activePost.value = slug.value
}
</script>

<template>
  <article
    :aria-busy="isSkeleton || undefined"
    :aria-label="isSkeleton ? t('loadingArticle') : undefined"
  >
    <UiCard
      variant="pane"
      class="card-post"
      :class="{ 'wide-post': featured, 'card-post-skeleton': isSkeleton }"
    >
      <template #header>
        <!-- Cover -->
        <div class="card-post-cover">
          <NuxtImg
            v-if="!isSkeleton && post.imageURL"
            :src="post.imageURL"
            :alt="post.imageAlt || post.title"
            :loading="featured ? 'eager' : 'lazy'"
            width="1200"
            height="630"
            :sizes="featured ? 'sm:100vw md:50vw xl:640px' : 'sm:100vw md:50vw xl:400px'"
            preset="cover"
            class="img-fluid"
            :class="{ 'vt-post-image': isTransitionTarget }"
          />
        </div>
      </template>
      <template #body>
        <!-- Skeleton -->
        <div
          v-if="isSkeleton"
          class="card-post-details"
          aria-hidden="true"
        >
          <UiBaseSkeleton width="9rem" />
          <UiBaseSkeleton
            size="md"
            width="85%"
          />
          <UiBaseSkeleton width="95%" />
          <UiBaseSkeleton width="10rem" />
        </div>

        <!-- Details -->
        <div
          v-else
          class="card-post-details"
        >
          <!-- Series, badge and date -->
          <div class="card-post-meta">
            <UiBadge
              v-if="badgeText"
              variant="tonal tonal-accent"
              :text="badgeText"
              :icon-code="badgeIconCode"
            />
            <NuxtLink
              v-if="series"
              :to="series.to"
              class="card-post-chip badge badge-tonal tonal-secondary undecorated"
              :title="t('partOfSeries', { series: series.name })"
            >
              {{ series.name }}
            </NuxtLink>
            <time
              v-if="publishedLabel"
              :datetime="publishedIso"
              class="caption text-muted"
            >
              {{ publishedLabel }}
            </time>
          </div>

          <component
            :is="headingTag"
            class="card-post-title mb-0"
            :class="featured ? 'display-3' : 'fs-xl fw-500 lh-base'"
          >
            <NuxtLink
              :to="blogPath(`/${slug}`)"
              class="card-post-link undecorated"
              @pointerdown="markActive"
            >
              <span
                class="d-block"
                :class="{ 'vt-post-header': isTransitionTarget }"
              >{{ post.title }}</span>
            </NuxtLink>
          </component>

          <p
            class="card-post-excerpt text-muted lh-md mb-0"
            :class="featured ? 'body-1' : 'body-2'"
          >
            {{ post.shortText }}
          </p>

          <!-- Tags -->
          <div class="card-post-tags">
            <NuxtLink
              v-for="tag in displayedTags"
              :key="tag"
              :to="blogPath(`/tags/${encodeURIComponent(tag)}`)"
              class="card-post-chip badge badge-tonal tonal-secondary undecorated"
            >
              {{ tag }}
            </NuxtLink>
          </div>

          <!-- Author (featured only) -->
          <div
            v-if="featured"
            class="d-flex align-items-center gap-2"
          >
            <UiAvatar
              v-if="post.authorPhotoURL"
              :src="post.authorPhotoURL"
              :alt="`${authorName} photo`"
              size="sm"
            />
            <UiAvatar
              v-else
              :initials="authorInitial"
              :alt="`${authorName} photo`"
              size="sm"
              color="secondary"
              variant="tonal"
              class="me-0"
            />
            <NuxtLink
              v-if="post.authorSlug"
              :to="blogPath(`/authors/${post.authorSlug}`)"
              class="card-post-author caption text-muted fw-400 undecorated"
            >
              {{ authorName }}
            </NuxtLink>
            <span
              v-else
              class="caption text-muted fw-400"
            >
              {{ authorName }}
            </span>
          </div>
        </div>
      </template>
    </UiCard>
  </article>
</template>
