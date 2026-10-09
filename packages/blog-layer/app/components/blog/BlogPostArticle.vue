<script setup lang="ts">
import type { IAuthor } from '#blog/shared/models/author'
import type { IPost } from '#blog/shared/models/post'
import type { IPostSeries } from '#blog/shared/types/api'
import type { IPostHeading } from '#blog/shared/utils/post-headings'
import { useClipboard, useIntersectionObserver, useShare } from '@vueuse/core'
import { NuxtLink } from '#components'

/** Interfaces */
interface IProps {
  post: IPost
  contents: string
  author?: IAuthor | null
  headings?: IPostHeading[]
  readingTime?: number
  related?: IPost[]
  older?: IPost | null
  newer?: IPost | null
  series?: IPostSeries | null
}

/** Props */
const {
  post,
  contents,
  author = null,
  headings = [],
  readingTime = undefined,
  related = [],
  older = null,
  newer = null,
  series = null
} = defineProps<IProps>()

/** Constants */
const MIN_MOBILE_TOC_HEADINGS = 3

/** Composables */
const { blogPath, blogUrl } = useBlogPath()
const { formatDateValue, normalizeDateValue } = useDateValue()
const brand = useAppConfig().blog
const { share, isSupported: isShareSupported } = useShare()
const { copy, copied } = useClipboard()
const activePost = useState<string | null>('activePost', () => null)

/** State */
const activeHeading = ref('')
const headingTargets = shallowRef<HTMLElement[]>([])

/** Computed */
const slug = computed(() => post.slug || post.id || '')
const title = computed(() => post.title || 'Article')
const authorName = computed(() => author?.name || resolveAuthorName(post, brand.defaultAuthor))
const publishedLabel = computed(() => formatDateValue(post.createdAt))
const publishedIso = computed(() => {
  const published = normalizeDateValue(post.createdAt)
  return published ? new Date(published).toISOString() : undefined
})
const readingMinutes = computed(() => readingTime ?? estimateReadingTime(contents))
const tags = computed(() => post.tags ?? [])
const markStyle = computed(() => ({ '--_mark-bg': post.color }))
const shareUrl = computed(() => blogUrl(`/${slug.value}`))
const isTransitionTarget = computed(() => activePost.value === slug.value)
const showMobileToc = computed(() => headings.length >= MIN_MOBILE_TOC_HEADINGS)
const hasH2Headings = computed(() => headings.some(heading => heading.level === 2))
const seriesParts = computed(() => series?.parts ?? [])
const seriesIndex = computed(() => seriesParts.value.findIndex(part => part.isCurrent))
const seriesLabel = computed(() => (seriesIndex.value >= 0
  ? `Part ${seriesIndex.value + 1} of ${seriesParts.value.length}`
  : `${seriesParts.value.length} parts`))
const seriesPrevious = computed(() => (seriesIndex.value > 0 ? seriesParts.value[seriesIndex.value - 1] ?? null : null))
const seriesNext = computed(() => (seriesIndex.value >= 0 ? seriesParts.value[seriesIndex.value + 1] ?? null : null))
const seriesUrl = computed(() => (series ? blogPath(`/series/${encodeURIComponent(series.slug)}`) : ''))

/** Methods */
function postSlug(item: IPost): string {
  return item.slug || item.id || ''
}
async function handleShare(): Promise<void> {
  if (isShareSupported.value) {
    try {
      await share({ title: title.value, text: post.shortText || '', url: shareUrl.value })
    } catch {
      // Share sheet dismissed
    }
    return
  }

  await copy(shareUrl.value)
}
function collectHeadingTargets(): void {
  headingTargets.value = headings
    .map(heading => document.getElementById(heading.id))
    .filter((element): element is HTMLElement => Boolean(element))
}
function handleIntersection(entries: IntersectionObserverEntry[]): void {
  const ids = headings.map(heading => heading.id)
  for (const entry of entries) {
    const id = (entry.target as HTMLElement).id
    if (entry.isIntersecting) {
      activeHeading.value = id
    } else if (activeHeading.value === id && entry.rootBounds && entry.boundingClientRect.top > entry.rootBounds.bottom) {
      activeHeading.value = ids[ids.indexOf(id) - 1] ?? ''
    }
  }
}

/** Lifecycle */
useIntersectionObserver(headingTargets, handleIntersection, {
  rootMargin: '-96px 0px -66% 0px'
})
onMounted(collectHeadingTargets)

/** Watch */
watch(() => headings, async () => {
  await nextTick()
  collectHeadingTargets()
})
</script>

<template>
  <article class="d-grid gap-8">
    <!-- Header -->
    <div class="post-article-grid">
      <header class="post-article-main d-grid gap-4">
        <div class="d-flex align-items-center flex-wrap gap-3">
          <span
            v-if="post.color"
            class="post-article-mark color-mark"
            :style="markStyle"
            aria-hidden="true"
          />
          <time
            v-if="publishedLabel"
            class="caption text-muted"
            :datetime="publishedIso"
          >{{ publishedLabel }}</time>
          <span class="caption text-muted">{{ readingMinutes }} min read</span>
          <NuxtLink
            v-if="author?.slug"
            :to="blogPath(`/authors/${author.slug}`)"
            class="caption fw-600 text-link"
          >
            By {{ authorName }}
          </NuxtLink>
          <span
            v-else
            class="caption text-muted"
          >By {{ authorName }}</span>
        </div>
        <h1
          class="display-1 mb-0"
          :class="{ 'vt-post-header': isTransitionTarget }"
        >
          {{ title }}
        </h1>
        <p
          v-if="post.shortText"
          class="post-article-lead text-muted mb-0"
        >
          {{ post.shortText }}
        </p>
        <UiBadgeGroup v-if="tags.length">
          <NuxtLink
            v-for="tag in tags"
            :key="tag"
            :to="blogPath(`/tags/${encodeURIComponent(tag)}`)"
            class="undecorated"
          >
            <UiBadge
              :text="tag"
              variant="tonal tonal-secondary"
            />
          </NuxtLink>
        </UiBadgeGroup>
        <div class="post-article-share-inline d-flex align-items-center flex-wrap gap-2">
          <UiButtonGroup connected>
            <UiButton
              variant="chip"
              size="sm"
              text="Share"
              aria-label="Share this article"
              @click="handleShare"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe80d;" />
              </template>
            </UiButton>
            <UiButton
              variant="chip"
              size="sm"
              :text="copied ? 'Copied' : 'Copy link'"
              aria-label="Copy the link to this article"
              @click="copy(shareUrl)"
            >
              <template #icon>
                <UiIconMaterial :icon-code="copied ? '&#xe5ca;' : '&#xe157;'" />
              </template>
            </UiButton>
          </UiButtonGroup>
        </div>
      </header>
    </div>

    <!-- Cover -->
    <NuxtImg
      v-if="post.imageURL"
      :src="post.imageURL"
      :alt="post.imageAlt || title"
      class="post-article-cover"
      :class="{ 'vt-post-image': isTransitionTarget }"
      width="1200"
      height="630"
      sizes="sm:100vw lg:960px"
      preset="cover"
      fetchpriority="high"
      preload
    />

    <div class="post-article-grid">
      <!-- Actions -->
      <aside
        class="post-article-rail post-article-rail-start"
        aria-label="Article actions"
      >
        <UiButtonTooltip
          :as="NuxtLink"
          :to="blogPath()"
          variant="tonal"
          color="neutral"
          icon
          rounded
          tooltip-text="All articles"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe5c4;" />
          </template>
        </UiButtonTooltip>
        <span
          class="post-article-rail-divider"
          aria-hidden="true"
        />
        <UiButtonTooltip
          variant="tonal"
          color="neutral"
          icon
          rounded
          tooltip-text="Share"
          @click="handleShare"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe80d;" />
          </template>
        </UiButtonTooltip>
        <UiButtonTooltip
          variant="tonal"
          color="neutral"
          icon
          rounded
          :tooltip-text="copied ? 'Copied' : 'Copy link'"
          @click="copy(shareUrl)"
        >
          <template #icon>
            <UiIconMaterial :icon-code="copied ? '&#xe5ca;' : '&#xe157;'" />
          </template>
        </UiButtonTooltip>
      </aside>

      <div class="post-article-main d-grid gap-8">
        <!-- Series -->
        <UiCard
          v-if="series"
          variant="pane"
        >
          <template #body>
            <nav
              class="d-grid gap-3"
              :aria-label="`${series.name} series`"
            >
              <p class="d-flex align-items-center flex-wrap gap-2 mb-0">
                <UiIconMaterial
                  icon-code="&#xe242;"
                  class="iw-bold fs-sm text-muted"
                />
                <span class="caption font-code text-muted">{{ seriesLabel }}</span>
                <span
                  class="caption text-muted"
                  aria-hidden="true"
                >·</span>
                <NuxtLink
                  :to="seriesUrl"
                  class="fw-600 text-link"
                >
                  {{ series.name }}
                </NuxtLink>
              </p>
              <UiListGroup
                is-interactive
                custom-class="post-article-series-parts"
              >
                <UiListItem
                  v-for="(part, index) in seriesParts"
                  :key="`series-${part.slug}`"
                  :as="NuxtLink"
                  :to="part.isCurrent ? null : `/${part.slug}`"
                  :title="part.title"
                  :active="part.isCurrent"
                  :aria-current="part.isCurrent ? 'page' : undefined"
                  custom-class="bg-transparent"
                >
                  <template #media>
                    <span class="list-item-icon-wrapper post-article-series-number font-code fs-3xs">{{ index + 1 }}</span>
                  </template>
                </UiListItem>
              </UiListGroup>
            </nav>
          </template>
        </UiCard>

        <!-- Mobile table of contents -->
        <UiAccordionGroup
          v-if="showMobileToc"
          custom-class="post-article-toc-mobile"
        >
          <UiAccordion
            id="post-toc"
            name="post-toc"
            title="On this page"
            icon="&#xe8de;"
            class="bg-surface-pane"
          >
            <template #content>
              <UiListGroup
                is-interactive
                is-undecorated
                variant="flush"
              >
                <UiListItem
                  v-for="heading in headings"
                  :key="`toc-mobile-${heading.id}`"
                  :href="`#${heading.id}`"
                  :title="heading.text"
                  :custom-class="{ 'post-article-toc-sub': heading.level === 3 }"
                />
              </UiListGroup>
            </template>
          </UiAccordion>
        </UiAccordionGroup>

        <!-- Body -->
        <BlogPostContent
          v-if="contents"
          :html="contents"
        />

        <!-- Previous and next -->
        <nav
          class="d-grid grid-repeat-cols-md-2 gap-3"
          :aria-label="series ? 'Series parts and other articles' : 'Other articles'"
        >
          <UiCard
            v-if="seriesPrevious"
            variant="pane"
            :as="NuxtLink"
            :to="blogPath(`/${seriesPrevious.slug}`)"
          >
            <template #body>
              <div class="d-grid gap-1">
                <span class="caption text-muted d-inline-flex align-items-center gap-1">
                  <UiIconMaterial
                    icon-code="&#xe5c4;"
                    class="fs-4xs"
                  />
                  Previous in series
                </span>
                <span class="fw-600">{{ seriesPrevious.title }}</span>
                <span class="font-code fs-3xs text-muted">Part {{ seriesIndex }} of {{ seriesParts.length }}</span>
              </div>
            </template>
          </UiCard>
          <UiCard
            v-else-if="older"
            variant="pane"
            :as="NuxtLink"
            :to="blogPath(`/${postSlug(older)}`)"
          >
            <template #body>
              <div class="d-grid gap-1">
                <span class="caption text-muted d-inline-flex align-items-center gap-1">
                  <UiIconMaterial
                    icon-code="&#xe5c4;"
                    class="fs-4xs"
                  />
                  Older
                </span>
                <span class="fw-600">{{ older.title }}</span>
                <span class="font-code fs-3xs text-muted">{{ formatDateValue(older.createdAt) }}</span>
              </div>
            </template>
          </UiCard>
          <UiCard
            v-else
            variant="pane"
            class="opacity-50"
          >
            <template #body>
              <div class="d-grid gap-1">
                <span class="caption text-muted">Older</span>
                <span class="fw-600">This is the first article</span>
              </div>
            </template>
          </UiCard>
          <UiCard
            v-if="seriesNext"
            variant="pane"
            :as="NuxtLink"
            :to="blogPath(`/${seriesNext.slug}`)"
          >
            <template #body>
              <div class="d-grid gap-1 justify-items-end text-end">
                <span class="caption text-muted d-inline-flex align-items-center gap-1">
                  Next in series
                  <UiIconMaterial
                    icon-code="&#xe5c8;"
                    class="fs-4xs"
                  />
                </span>
                <span class="fw-600">{{ seriesNext.title }}</span>
                <span class="font-code fs-3xs text-muted">Part {{ seriesIndex + 2 }} of {{ seriesParts.length }}</span>
              </div>
            </template>
          </UiCard>
          <UiCard
            v-else-if="newer"
            variant="pane"
            :as="NuxtLink"
            :to="blogPath(`/${postSlug(newer)}`)"
          >
            <template #body>
              <div class="d-grid gap-1 justify-items-end text-end">
                <span class="caption text-muted d-inline-flex align-items-center gap-1">
                  Newer
                  <UiIconMaterial
                    icon-code="&#xe5c8;"
                    class="fs-4xs"
                  />
                </span>
                <span class="fw-600">{{ newer.title }}</span>
                <span class="font-code fs-3xs text-muted">{{ formatDateValue(newer.createdAt) }}</span>
              </div>
            </template>
          </UiCard>
          <UiCard
            v-else
            variant="pane"
            class="opacity-50"
          >
            <template #body>
              <div class="d-grid gap-1 justify-items-end text-end">
                <span class="caption text-muted">Newer</span>
                <span class="fw-600">You are on the latest article</span>
              </div>
            </template>
          </UiCard>
        </nav>
      </div>

      <!-- On this page -->
      <aside
        class="post-article-rail post-article-rail-end"
        aria-label="On this page"
      >
        <nav
          v-if="series"
          class="post-article-rail-group"
          :aria-label="`${series.name} series parts`"
        >
          <span class="post-article-rail-label">{{ seriesLabel }}</span>
          <NuxtLink
            :to="seriesUrl"
            class="post-article-rail-title"
          >
            {{ series.name }}
          </NuxtLink>
          <component
            :is="part.isCurrent ? 'span' : NuxtLink"
            v-for="(part, index) in seriesParts"
            :key="`series-rail-${part.slug}`"
            :to="part.isCurrent ? undefined : `/${part.slug}`"
            class="post-article-rail-link undecorated"
            :class="{ 'is-active': part.isCurrent }"
            :aria-current="part.isCurrent ? 'page' : undefined"
          >
            <span class="post-article-rail-number">{{ index + 1 }}</span>
            {{ part.title }}
          </component>
        </nav>
        <nav
          v-if="headings.length"
          class="post-article-rail-group"
          aria-label="Sections"
        >
          <span class="post-article-rail-label">On this page</span>
          <a
            v-for="heading in headings"
            :key="`toc-${heading.id}`"
            :href="`#${heading.id}`"
            class="post-article-rail-link has-dot undecorated"
            :class="{ 'is-active': activeHeading === heading.id, 'is-sub': heading.level === 3 && hasH2Headings }"
            :aria-current="activeHeading === heading.id ? 'location' : undefined"
          >
            {{ heading.text }}
          </a>
        </nav>
      </aside>
    </div>

    <!-- Related posts -->
    <section
      v-if="related.length"
      class="mt-section"
      aria-labelledby="post-related-heading"
    >
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2
          id="post-related-heading"
          class="text-subheading subheading-m0"
        >
          Related articles
        </h2>
        <NuxtLink
          :to="blogPath()"
          title="View all articles"
          class="btn btn-text text-neutral btn-icon"
        >
          <UiIconMaterial icon-code="&#xe5c8;" />
        </NuxtLink>
      </div>
      <BlogPostList
        :posts="related"
        heading-tag="h3"
      />
    </section>
  </article>
</template>
