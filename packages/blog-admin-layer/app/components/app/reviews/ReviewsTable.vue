<script setup lang="ts">
import type { IDatatableColumn } from '@colorffy/ui'
import type { IPost, PostStatus } from '@giancarlosgza/blog-core'
import { breakpointsBootstrapV5, useBreakpoints } from '@vueuse/core'
import { resolvePostStatus } from '#admin/shared/utils/post-status'
import { NuxtLink } from '#components'

/** Interfaces */
interface IProps {
  posts?: IPost[] | null
  isLoading?: boolean | null
  busySlug?: string | null
  emptyTitle?: string
  emptySubtitle?: string
  summary?: string | null
}
interface IEmits {
  approve: [post: IPost]
  requestChanges: [post: IPost]
  schedule: [post: IPost]
  publishNow: [post: IPost]
  cancelSchedule: [post: IPost]
}
interface ITableItem {
  uuid: string
  title: string
  slug: string
  color?: string
  imageURL?: string
  author: string
  authorPhotoURL?: string
  submittedAt: unknown
  round: number
  status: PostStatus
  publishAt: unknown
  original: IPost
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  posts: null,
  isLoading: null,
  busySlug: null,
  emptyTitle: 'Nothing to review',
  emptySubtitle: 'Posts that editors submit appear here.',
  summary: null
})

/** Emit */
const emit = defineEmits<IEmits>()

/** Data */
const { defaultAuthor } = useAppConfig().admin
const tableColumns: IDatatableColumn[] = [
  { key: 'uuid', label: 'UUID', hidden: true },
  { key: 'title', label: 'Post' },
  { key: 'author', label: 'Author' },
  { key: 'submittedAt', label: 'Submitted' },
  { key: 'round', label: 'Round' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', sortable: false }
]
const breakpoints = useBreakpoints(breakpointsBootstrapV5)
const isMobile = breakpoints.smallerOrEqual('sm')

/** Composables */
const { formatDate, formatDateTime, formatTitleDate } = useAdminDateFormat()

/** Computed */
const tableItems = computed<ITableItem[]>(() => (props.posts ?? []).map(post => ({
  uuid: post.id ?? '',
  title: post.title || post.id || '',
  slug: post.slug ?? post.id ?? '',
  color: post.color,
  imageURL: post.imageURL,
  author: resolveAuthorName(post, defaultAuthor),
  authorPhotoURL: post.authorPhotoURL,
  submittedAt: post.review?.submittedAt,
  round: post.review?.round ?? 1,
  status: resolvePostStatus(post),
  publishAt: post.publishAt,
  original: post
})))
const normalizedLoading = computed<boolean | undefined>(() => props.isLoading ?? undefined)
</script>

<template>
  <UiDatatable
    :columns="tableColumns"
    :items="tableItems"
    :is-loading="normalizedLoading"
    :skeleton-rows="6"
    table-class="table-bordered"
    column-manager
    :empty-state-title="props.emptyTitle"
    :empty-state-subtitle="props.emptySubtitle"
    class="d-grid"
    :toolbar-button="{ variant: 'text' }"
  >
    <template #controls>
      <AppTableSummary :text="props.summary || `${tableItems.length} ${tableItems.length === 1 ? 'post' : 'posts'}`" />
    </template>
    <template #cell-uuid="{ item }">
      <span class="fw-500 text-muted">{{ item.uuid }}</span>
    </template>
    <template #cell-title="{ item }">
      <NuxtLink
        :to="`/posts/${item.uuid}`"
        class="review-post"
        :style="{ '--_review-post-color': item.color || undefined }"
      >
        <img
          v-if="item.imageURL"
          :src="item.imageURL"
          alt=""
          class="review-post-thumb"
          loading="lazy"
        >
        <span
          v-else
          class="review-post-thumb"
          aria-hidden="true"
        />
        <span class="review-post-text">
          <span
            class="review-post-title"
            :title="item.title"
          >{{ item.title }}</span>
          <span class="review-post-slug font-code fs-4xs text-muted">/{{ item.slug }}</span>
        </span>
      </NuxtLink>
    </template>
    <template #cell-author="{ item }">
      <span class="d-inline-flex align-items-center gap-2 text-nowrap">
        <UiAvatar
          :src="item.authorPhotoURL || undefined"
          :initials="getInitials(item.author)"
          size="sm"
          color="info"
          variant="tonal"
          class="mx-0"
        />
        {{ item.author }}
      </span>
    </template>
    <template #cell-submittedAt="{ item }">
      <span
        class="text-muted fl-capitalize text-nowrap"
        :title="formatTitleDate(item.submittedAt)"
      >
        {{ formatDate(item.submittedAt) }}
      </span>
    </template>
    <template #cell-round="{ item }">
      <UiBadge
        v-if="item.round > 1"
        variant="outline"
        size="sm"
        :text="`R${item.round}`"
        :title="`Round ${item.round}`"
      />
      <span
        v-else
        class="text-muted"
        aria-label="First round"
      >-</span>
    </template>
    <template #cell-status="{ item }">
      <span class="d-grid gap-1 justify-items-start">
        <AppPostsStatusBadge :status="item.status" />
        <span
          v-if="item.status === 'scheduled'"
          class="fs-4xs text-muted text-nowrap"
        >
          {{ formatDateTime(item.publishAt) }}
        </span>
      </span>
    </template>
    <template #cell-actions="{ item }">
      <UiButtonGroup
        class="flex-nowrap justify-content-end"
        connected
      >
        <UiButton
          v-if="item.status === 'review'"
          variant="tonal"
          color="secondary"
          size="sm"
          text="Approve"
          :loading="props.busySlug === item.uuid"
          :disabled="!!props.busySlug"
          @click="emit('approve', item.original)"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe5ca;" />
          </template>
        </UiButton>
        <UiButtonMenu
          :id="`review-${item.uuid}-actions`"
          variant="outline"
          size="sm"
          icon
          :tooltip-text="`More actions for ${item.title}`"
          :aria-label="`More actions for ${item.title}`"
          :is-mobile="isMobile"
          :disabled="!!props.busySlug"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe5d4;" />
          </template>
          <template #menu>
            <UiButtonMenuItem
              icon="&#xe3c9;"
              item-text="Open"
              @click="navigateTo(`/posts/${item.uuid}`)"
            />
            <UiButtonMenuDivider />
            <UiButtonMenuItem
              v-if="item.status === 'review'"
              icon="&#xe0b9;"
              item-text="Request changes"
              @click="emit('requestChanges', item.original)"
            />
            <UiButtonMenuItem
              v-if="item.status === 'scheduled'"
              icon="&#xe2c6;"
              item-text="Publish now"
              @click="emit('publishNow', item.original)"
            />
            <UiButtonMenuItem
              icon="&#xe8b5;"
              :item-text="item.status === 'scheduled' ? 'Reschedule…' : 'Schedule…'"
              :disabled="item.original.isPublished"
              @click="emit('schedule', item.original)"
            />
            <template v-if="item.status === 'scheduled'">
              <UiButtonMenuDivider />
              <UiButtonMenuItem
                icon="&#xe5c9;"
                item-text="Cancel schedule"
                is-destructive
                @click="emit('cancelSchedule', item.original)"
              />
            </template>
          </template>
        </UiButtonMenu>
      </UiButtonGroup>
    </template>
  </UiDatatable>
</template>
