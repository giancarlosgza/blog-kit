<script setup lang="ts">
import type { IDialogDisplay, UiAlertToast } from '@colorffy/ui'
import type { IPost, PostStatus } from '@giancarlosgza/blog-core'
import type AppPostsPublishDialog from '#admin/app/components/app/posts/PostsPublishDialog.vue'
import type AppPostsRequestChangesSheet from '#admin/app/components/app/posts/PostsRequestChangesSheet.vue'
import type { IPostWorkflowResponse } from '#admin/app/composables/usePostWorkflow'
import { useToast } from '@colorffy/ui'
import { where } from 'firebase/firestore'
import { resolvePostStatus } from '#admin/shared/utils/post-status'

/** Interfaces */
type ReviewTab = 'review' | 'changes' | 'scheduled' | 'all'

/** Head */
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined

definePageMeta({
  pageTitle: 'Reviews',
  middleware: ['auth'],
  roles: ['admin']
})
useSeoMeta({
  title: 'Review queue',
  description: 'Approve, schedule or send back posts submitted by editors.',
  ogTitle: 'Review queue',
  ogDescription: 'Approve, schedule or send back posts submitted by editors.',
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Review queue',
  twitterDescription: 'Approve, schedule or send back posts submitted by editors.',
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
const QUEUE_STATUSES: PostStatus[] = ['review', 'changes', 'scheduled']
const router = useRouter()
const selectedPost = ref<IPost | null>(null)
const busySlug = ref<string | null>(null)
const requestChangesError = ref<string | null>(null)
const publishDialog = useTemplateRef<InstanceType<typeof AppPostsPublishDialog>>('publishDialog')
const requestChangesSheet = useTemplateRef<InstanceType<typeof AppPostsRequestChangesSheet>>('requestChangesSheet')
const cancelScheduleDialog = ref<IDialogDisplay | null>(null)

/** Composables */
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)
const workflow = usePostWorkflow()
const { refresh: refreshReviewCount } = useReviewQueueCount()
const {
  documents: posts,
  error,
  isLoading,
  fetchDocs: fetchPosts
} = useFirebaseCollection<IPost>({
  collectionPath: 'posts',
  orderByField: null,
  docsLimit: null
})

/** Computed */
const tab = computed<ReviewTab>(() => {
  const value = route.query.tab
  return value === 'changes' || value === 'scheduled' || value === 'all' ? value : 'review'
})
const queue = computed(() => posts.value.filter(post => QUEUE_STATUSES.includes(resolvePostStatus(post))))
const counts = computed(() => {
  const result: Record<ReviewTab, number> = { review: 0, changes: 0, scheduled: 0, all: queue.value.length }
  for (const post of queue.value)
    result[resolvePostStatus(post) as Exclude<ReviewTab, 'all'>] += 1
  return result
})
const tabOptions = computed(() => [
  { id: 'review', text: `In review (${counts.value.review})` },
  { id: 'changes', text: `Changes requested (${counts.value.changes})` },
  { id: 'scheduled', text: `Scheduled (${counts.value.scheduled})` },
  { id: 'all', text: 'All' }
])
const visiblePosts = computed(() => {
  const list = tab.value === 'all' ? queue.value : queue.value.filter(post => resolvePostStatus(post) === tab.value)
  return [...list].sort((a, b) => {
    const aScheduled = resolvePostStatus(a) === 'scheduled'
    const bScheduled = resolvePostStatus(b) === 'scheduled'
    if (aScheduled && bScheduled)
      return toMillis(a.publishAt) - toMillis(b.publishAt)
    if (aScheduled !== bScheduled)
      return aScheduled ? 1 : -1
    return toMillis(b.review?.submittedAt) - toMillis(a.review?.submittedAt)
  })
})
const subtitle = computed(() => {
  const waiting = counts.value.review
  if (!waiting)
    return 'No posts are waiting for review'
  return `${waiting} ${waiting === 1 ? 'post is' : 'posts are'} waiting for review`
})
const emptyState = computed(() => ({
  review: { title: 'Nothing in review', subtitle: 'Posts that editors submit for review appear here.' },
  changes: { title: 'No changes requested', subtitle: 'Posts you send back to their authors wait here until they are resubmitted.' },
  scheduled: { title: 'Nothing scheduled', subtitle: 'Approve a post with a publish time to schedule it.' },
  all: { title: 'The queue is empty', subtitle: 'Submitted, sent back and scheduled posts appear here.' }
}[tab.value]))
const selectedTitle = computed(() => selectedPost.value?.title || selectedPost.value?.id || 'this post')

/** Lifecycle */
onMounted(() => loadQueue())

/** Methods */
async function loadQueue(): Promise<void> {
  await fetchPosts([where('status', 'in', QUEUE_STATUSES)])
}
function selectTab(value: string | string[] | null): void {
  if (typeof value !== 'string')
    return
  router.replace({ query: { ...route.query, tab: value === 'review' ? undefined : value } })
}
function slugOf(post: IPost | null): string {
  return post?.id ?? post?.slug ?? ''
}
function patchPost(slug: string, response: IPostWorkflowResponse): void {
  posts.value = posts.value.map(post => (slugOf(post) === slug ? applyWorkflowResponse(post, response) : post))
}
async function runAction(post: IPost, action: (slug: string) => Promise<IPostWorkflowResponse>, success: string, fallback: string): Promise<boolean> {
  const slug = slugOf(post)
  busySlug.value = slug
  try {
    patchPost(slug, await action(slug))
    onToastMessage('success', success)
    refreshReviewCount()
    return true
  } catch (err: unknown) {
    onToastMessage('danger', workflowErrorMessage(err, fallback))
    return false
  } finally {
    busySlug.value = null
  }
}
function openApprove(post: IPost): void {
  selectedPost.value = post
  publishDialog.value?.showDialog('now')
}
function openSchedule(post: IPost): void {
  selectedPost.value = post
  publishDialog.value?.showDialog('schedule', toMillis(post.publishAt) || null)
}
async function onConfirmPublish(publishAt: number | null): Promise<void> {
  if (!selectedPost.value)
    return
  const isReview = resolvePostStatus(selectedPost.value) === 'review'
  const success = publishAt ? (isReview ? 'Approved and scheduled' : 'Scheduled') : (isReview ? 'Approved and published' : 'Published')
  if (await runAction(selectedPost.value, slug => workflow.publish(slug, publishAt), success, 'Failed to publish.'))
    publishDialog.value?.closeDialog()
}
function onPublishNow(post: IPost): void {
  runAction(post, slug => workflow.publish(slug), 'Published', 'Failed to publish.')
}
function openRequestChanges(post: IPost): void {
  selectedPost.value = post
  requestChangesError.value = null
  requestChangesSheet.value?.showDialog()
}
async function onRequestChanges(payload: { note: string, reasons: string[] }): Promise<void> {
  const slug = slugOf(selectedPost.value)
  if (!slug)
    return
  requestChangesError.value = null
  busySlug.value = slug
  try {
    patchPost(slug, await workflow.requestChanges(slug, payload.note, payload.reasons))
    requestChangesSheet.value?.closeDialog()
    onToastMessage('success', 'Sent back to the author')
    refreshReviewCount()
  } catch (err: unknown) {
    requestChangesError.value = workflowErrorMessage(err, 'Failed to request changes.')
  } finally {
    busySlug.value = null
  }
}
function openCancelSchedule(post: IPost): void {
  selectedPost.value = post
  cancelScheduleDialog.value?.showDialog()
}
async function onCancelSchedule(): Promise<void> {
  if (selectedPost.value && await runAction(selectedPost.value, slug => workflow.unpublish(slug), 'Schedule cancelled', 'Failed to cancel the schedule.'))
    cancelScheduleDialog.value?.closeDialog()
}
</script>

<template>
  <div class="container-fluid mb-5">
    <!-- Header -->
    <UiHeaderContent
      title="Review queue"
      :subtitle="subtitle"
      view-transition-name="selected-headline"
    />

    <!-- Error -->
    <UiAlert
      v-if="error"
      type="tonal"
      variant="danger"
      size="sm"
      :message="`${error}`"
      class="mb-3"
    />

    <!-- Filters -->
    <UiCard
      variant="pane"
      class="list-filters"
    >
      <template #body>
        <UiChipGroup
          :options="tabOptions"
          :model-value="tab"
          variant="outline"
          color="secondary"
          aria-label="Filter by status"
          @update:model-value="selectTab"
        />
      </template>
    </UiCard>

    <!-- Queue -->
    <UiCard
      variant="pane"
      class="list-panel mb-3"
    >
      <template #body>
        <AppReviewsTable
          :posts="visiblePosts"
          :is-loading="isLoading"
          :busy-slug="busySlug"
          :empty-title="emptyState.title"
          :empty-subtitle="emptyState.subtitle"
          @approve="openApprove"
          @request-changes="openRequestChanges"
          @schedule="openSchedule"
          @publish-now="onPublishNow"
          @cancel-schedule="openCancelSchedule"
        />
      </template>
    </UiCard>

    <!-- Hint -->
    <UiCard
      v-if="tab === 'review' && visiblePosts.length"
      variant="pane"
    >
      <template #header>
        <UiSubheadingContent
          title="Nothing else in review"
          as="h2"
          gutter="none"
        />
      </template>
      <template #body>
        <p class="fs-3xs text-muted mb-0">
          Posts that editors submit appear here. Approve publishes them right away or on their schedule; Request changes sends them back with a note.
        </p>
      </template>
    </UiCard>

    <!-- Dialogs -->
    <AppPostsPublishDialog
      ref="publishDialog"
      :post-title="selectedTitle"
      :is-approval="!!selectedPost && resolvePostStatus(selectedPost) === 'review'"
      :can-schedule="!selectedPost?.isPublished"
      :is-loading="!!busySlug"
      @confirm="onConfirmPublish"
    />
    <AppPostsRequestChangesSheet
      ref="requestChangesSheet"
      :post-title="selectedTitle"
      :is-loading="!!busySlug"
      :error-message="requestChangesError"
      @send="onRequestChanges"
    />
    <UiConfirmModal
      ref="cancelScheduleDialog"
      variant="warning"
      :title="`Cancel the schedule for ${selectedTitle}?`"
      message="The post goes back to Draft and stays hidden. You can schedule or publish it again later."
      confirm-label="Cancel schedule"
      loading-label="Cancelling..."
      cancel-label="Keep it"
      :is-loading="!!busySlug"
      @confirm="onCancelSchedule"
    />

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </div>
</template>
