<script setup lang="ts">
import type { IPost } from '@giancarlosgza/blog-core'
import { breakpointsBootstrapV5, useBreakpoints } from '@vueuse/core'
import { resolvePostStatus } from '#admin/shared/utils/post-status'
import { NuxtLink } from '#components'

/** Interfaces */
interface IProps {
  posts?: IPost[] | null
  isLoading?: boolean | null
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  posts: null,
  isLoading: null
})

/** Emit */
const emit = defineEmits<{
  delete: [post: IPost]
}>()

/** Data */
const { defaultAuthor } = useAppConfig().admin
const breakpoints = useBreakpoints(breakpointsBootstrapV5)
const isMobile = breakpoints.smallerOrEqual('sm')
const active = useState('activePost', () => null as string | null)

/** Composables */
const { blogUrl } = useBlogUrl()
const { formatTitleDate } = useDateFormat()

/** Methods */
function publicUrl(post: IPost): string {
  return `${blogUrl}/${post.slug ?? post.id}`
}
function handleViewPost(post: IPost): void {
  navigateTo(publicUrl(post), {
    external: true,
    open: { windowFeatures: { noopener: true }, target: '_blank' }
  })
}
function handleEditPost(post: IPost): void {
  active.value = post.id ?? null
  navigateTo(`/posts/${post.id}`)
}
</script>

<template>
  <div>
    <UiGridSkeleton
      v-if="isLoading && !props.posts?.length"
      :skeleton-grid-items="12"
      grid-layout-classes="d-grid grid-repeat-cols-md-2 grid-repeat-cols-xl-3 gap-5"
    />
    <div
      v-else-if="props.posts?.length"
      class="d-grid grid-repeat-cols-md-2 grid-repeat-cols-xl-3 gap-5"
    >
      <article
        v-for="(post, index) in props.posts"
        :id="`post-${index}`"
        :key="`post-${post.id}`"
        class="post-card"
        :class="{ 'selected-post': active === post.id }"
        :style="{ '--_post-card-color': post.color || 'var(--cffy-muted-base-fixed)' }"
        tabindex="0"
        :aria-label="`Edit post ${post?.title || '-'}`"
        @dblclick.prevent="handleEditPost(post)"
      >
        <!-- Cover -->
        <div class="post-card-cover">
          <img
            v-if="post.imageURL"
            :src="post.imageURL"
            :alt="post.imageAlt || post.title || ''"
            class="post-card-image"
            loading="lazy"
          >
          <UiBadgeGroup class="gap-1">
            <UiBadge
              variant="outline"
              size="sm"
              :text="resolveAuthorName(post, defaultAuthor)"
              class="bg-frosted"
            />
            <UiBadge
              v-if="post.tags?.length"
              variant="outline"
              size="sm"
              :text="`${post.tags.length} ${post.tags.length === 1 ? 'tag' : 'tags'}`"
              class="bg-frosted"
            />
          </UiBadgeGroup>
          <div class="post-card-highlight">
            <span class="post-card-swatch" />
          </div>
        </div>

        <!-- Data -->
        <div class="post-card-body">
          <h2 class="text-card-title mb-0">
            {{ post?.title || post.id || '-' }}
          </h2>
          <p
            class="subtitle-2 text-muted mb-0"
            :title="post.shortText || 'No description provided'"
          >
            {{ truncateText(post.shortText, 100) }}
          </p>
          <a
            v-if="post.isPublished"
            :href="publicUrl(post)"
            target="_blank"
            rel="noopener"
            class="post-card-slug fs-3xs text-info"
          >
            <UiIconMaterial icon-code="&#xe157;" class="fs-sm" />
            {{ post.slug || post.id || 'N/A' }}
          </a>
          <span
            v-else
            class="post-card-slug fs-3xs text-muted"
          >
            <UiIconMaterial icon-code="&#xe157;" class="fs-sm" />
            {{ post.slug || post.id || 'N/A' }}
          </span>
        </div>

        <!-- Actions -->
        <div class="post-card-actions">
          <div class="post-card-meta">
            <UiBadge
              variant="outline"
              size="sm"
              :text="formatTitleDate(post.updatedAt) || '-'"
            />
            <AppPostsStatusBadge :status="resolvePostStatus(post)" />
          </div>
          <UiButtonGroup>
            <UiLinkTooltip
              :id="`post-${post.id}-edit`"
              :as="NuxtLink"
              :to="`/posts/${post.id}`"
              variant="outline"
              icon
              :tooltip-text="`Edit ${post?.title || 'post'}`"
              @click="active = post?.id ?? null"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe3c9;" />
              </template>
            </UiLinkTooltip>
            <UiButtonMenu
              :id="`post-${post.id}-actions`"
              variant="outline"
              icon
              tooltip-text="Manage post"
              :is-mobile="isMobile"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5d4;" />
              </template>
              <template #menu>
                <UiButtonMenuItem
                  icon="&#xe3c9;"
                  item-text="Edit"
                  @click="handleEditPost(post)"
                />
                <template v-if="post.isPublished">
                  <UiButtonMenuDivider />
                  <UiButtonMenuItem
                    icon="&#xe89e;"
                    item-text="View on blog"
                    @click="handleViewPost(post); active = post?.id ?? null"
                  />
                </template>
                <UiButtonMenuDivider />
                <UiButtonMenuItem
                  icon="&#xe872;"
                  item-text="Delete"
                  is-destructive
                  @click="emit('delete', post)"
                />
              </template>
            </UiButtonMenu>
          </UiButtonGroup>
        </div>
      </article>
    </div>
    <UiEmpty
      v-else
      title="No posts yet"
      subtitle="Create your first post to get started."
      use-custom-icon
      icon-code="&#xef42;"
    />
  </div>
</template>
