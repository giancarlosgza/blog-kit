<script setup lang="ts">
import type { IPost } from '#blog/shared/models/post'
import { NuxtLink } from '#components'

/** Interfaces */
interface IProps {
  posts: IPost[] | null | undefined
  pending?: boolean
  paginated?: boolean
  hasMore?: boolean
  nextHref?: string
  emptyTitle?: string
  emptySubtitle?: string
  headingTag?: 'h2' | 'h3'
}

/** Props */
const {
  posts,
  pending = false,
  paginated = false,
  hasMore = false,
  nextHref = undefined,
  emptyTitle = 'No articles found',
  emptySubtitle = 'Check back soon for new articles.',
  headingTag = 'h2'
} = defineProps<IProps>()

/** Emit */
const emit = defineEmits<{ loadMore: [] }>()

/** Composables */
const { blogPath } = useBlogPath()

/** Constants */
const SKELETON_COUNT = 6

/** Computed */
const hasPosts = computed(() => Boolean(posts?.length))
const isLoading = computed(() => pending && !hasPosts.value)
const skeletonPost: IPost = { title: '', isPublished: true }

/** Methods */
function freezeCardGeometry(el: Element): void {
  const card = el as HTMLElement
  card.style.left = `${card.offsetLeft}px`
  card.style.top = `${card.offsetTop}px`
  card.style.width = `${card.offsetWidth}px`
  card.style.height = `${card.offsetHeight}px`
}
function handleLoadMore(event: MouseEvent): void {
  if (nextHref && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey))
    return
  event.preventDefault()
  if (pending || !hasMore)
    return
  emit('loadMore')
}
</script>

<template>
  <div>
    <!-- Skeletons -->
    <div
      v-if="isLoading"
      class="blog-post-skeleton-grid d-grid grid-repeat-cols-1 grid-repeat-cols-md-2 grid-repeat-cols-xl-3 gap-5"
      role="status"
      aria-label="Loading articles"
    >
      <BlogPostCard
        v-for="indexSkeleton in SKELETON_COUNT"
        :key="`skeleton-${indexSkeleton}`"
        :post="skeletonPost"
        is-skeleton
      />
    </div>

    <!-- Grid -->
    <TransitionGroup
      v-else-if="hasPosts"
      tag="div"
      name="post-card"
      class="blog-post-grid d-grid grid-repeat-cols-1 grid-repeat-cols-md-2 grid-repeat-cols-xl-3 gap-inline-8 gap-block-10"
      @before-leave="freezeCardGeometry"
    >
      <BlogPostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :heading-tag="headingTag"
      />
    </TransitionGroup>

    <!-- Empty state -->
    <UiEmpty
      v-else
      :title="emptyTitle"
      :subtitle="emptySubtitle"
      custom-class="my-5 my-md-8"
    >
      <template #action>
        <slot name="empty-action">
          <UiButtonGroup class="justify-content-center">
            <UiButton
              :as="NuxtLink"
              :to="blogPath()"
              variant="tonal"
              color="primary"
              text="Back to home"
              class="btn-cta"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5c4;" />
              </template>
            </UiButton>
          </UiButtonGroup>
        </slot>
      </template>
    </UiEmpty>

    <!-- Load more -->
    <UiButtonGroup
      v-if="paginated && hasPosts"
      class="justify-content-center mt-5"
    >
      <UiButton
        variant="tonal"
        color="neutral"
        class="btn-cta hover-rotate"
        :href="hasMore ? nextHref : undefined"
        :rel="hasMore && nextHref ? 'next' : undefined"
        :text="hasMore ? 'Load more articles' : 'No more articles'"
        :disabled="!hasMore"
        :loading="pending"
        @click="handleLoadMore"
      >
        <template #icon>
          <UiIconMaterial :icon-code="hasMore ? '&#xe863;' : '&#xea76;'" />
        </template>
      </UiButton>
    </UiButtonGroup>
  </div>
</template>
