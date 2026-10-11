<script setup lang="ts">
import type { UiAlertToast } from '@colorffy/ui'
import type { IAuthor, IPost, IPostEvent, ISeries, ITag } from '@giancarlosgza/blog-core'
import type AppPostsHistorySheet from '#admin/app/components/app/posts/PostsHistorySheet.vue'
import type AppPostsPublishDialog from '#admin/app/components/app/posts/PostsPublishDialog.vue'
import type AppPostsRequestChangesSheet from '#admin/app/components/app/posts/PostsRequestChangesSheet.vue'
import type { IPostEditorForm } from '#admin/app/composables/usePostEditor'
import type { IPostWorkflowResponse } from '#admin/app/composables/usePostWorkflow'
import type { AdminRole } from '#admin/shared/models/admin'
import { useToast } from '@colorffy/ui'
import { postFeaturedPayload, postSeriesFormFields, postSeriesPayload } from '#admin/app/utils/post-series'
import { resolvePostStatus } from '#admin/shared/utils/post-status'

/** Head */
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined

definePageMeta({
  pageTransition: {
    name: 'slide-start',
    mode: 'out-in'
  },
  pageTitle: 'Posts',
  backRoute: '/posts',
  middleware: ['auth']
})
useSeoMeta({
  title: 'Edit Post',
  description: 'Edit post title, excerpt, author, cover image, tags, series and body.',
  ogTitle: 'Edit Post',
  ogDescription: 'Edit post title, excerpt, author, cover image, tags, series and body.',
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Edit Post',
  twitterDescription: 'Edit post title, excerpt, author, cover image, tags, series and body.',
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
const { defaultColor } = useAppConfig().admin
const slug = computed(() => route.params.slug?.toString() || '')
const error = ref<Error | null>(null)
const hasLoaded = ref<boolean>(false)
const body = ref<string>('')
const form = ref<IPostEditorForm>({
  title: '',
  shortText: '',
  authorId: '',
  authorName: '',
  authorUuid: '',
  imageURL: '',
  imageAlt: '',
  color: defaultColor,
  tags: [],
  seoTitle: '',
  seoDescription: '',
  ogImageURL: '',
  canonicalURL: '',
  noindex: false,
  seriesSlug: '',
  seriesOrder: null,
  isNewSeries: false,
  newSeriesName: '',
  newSeriesDescription: '',
  featured: false,
  featuredOrder: null
})
const historyEvents = ref<IPostEvent[]>([])
const isLoadingHistory = ref<boolean>(false)
const historyError = ref<string | null>(null)
const requestChangesError = ref<string | null>(null)
const publishDialog = useTemplateRef<InstanceType<typeof AppPostsPublishDialog>>('publishDialog')
const historySheet = useTemplateRef<InstanceType<typeof AppPostsHistorySheet>>('historySheet')
const requestChangesSheet = useTemplateRef<InstanceType<typeof AppPostsRequestChangesSheet>>('requestChangesSheet')

/** Composables */
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)
const { blogUrl } = useBlogUrl()
const {
  meta,
  draftHtml,
  isLoading,
  isSaving,
  load,
  saveMeta,
  saveDraft,
  applyWorkflow
} = usePostEditor(slug)
const workflow = usePostWorkflow()
const { refresh: refreshReviewCount } = useReviewQueueCount()
const adminRole = useState<AdminRole | null>('adminRole', () => null)
const currentUser = useCurrentUser()
const {
  documents: authorList,
  fetchDocs: fetchAuthors
} = useFirebaseCollection<IAuthor>({
  collectionPath: 'authors',
  orderByField: null,
  docsLimit: 100
})
const {
  documents: tagList,
  fetchDocs: fetchTags
} = useFirebaseCollection<ITag>({
  collectionPath: 'tags',
  orderByField: 'name',
  orderDirection: 'asc',
  docsLimit: 200
})
const {
  documents: seriesList,
  fetchDocs: fetchSeries
} = useFirebaseCollection<ISeries>({
  collectionPath: 'series',
  orderByField: 'name',
  orderDirection: 'asc',
  docsLimit: 200
})
const { createSeries } = providePostSeries()
providePostAi(form, body, tagList)

/** Computed */
const selectedAuthor = computed(() => authorList.value.find(author => author.id === form.value.authorId) ?? null)
const isFetching = computed(() => isLoading.value || !hasLoaded.value)
const isPublished = computed(() => !!meta.value?.isPublished)
const isAdmin = computed(() => adminRole.value === 'admin')
const status = computed(() => resolvePostStatus(meta.value))
const isBusy = computed(() => isSaving.value || !!workflow.pending.value)
const submitLabel = computed(() => {
  if (status.value === 'review')
    return 'In review'
  return status.value === 'changes' ? 'Resubmit' : 'Submit for review'
})
const publishLabel = computed(() => {
  if (status.value === 'review')
    return 'Approve & publish'
  if (status.value === 'scheduled')
    return 'Publish now'
  return isPublished.value ? 'Republish' : 'Publish'
})

/** Lifecycle */
onMounted(async () => {
  try {
    await Promise.all([load(), fetchAuthors(), fetchTags(), fetchSeries()])
    if (meta.value) {
      form.value.title = meta.value.title || ''
      form.value.shortText = meta.value.shortText || ''
      form.value.authorName = meta.value.authorName || meta.value.author || ''
      form.value.authorUuid = meta.value.authorUuid || ''
      form.value.imageURL = meta.value.imageURL || ''
      form.value.color = meta.value.color || defaultColor
      form.value.tags = meta.value.tags || []
      Object.assign(form.value, postSeoFormFields(meta.value), postSeriesFormFields(meta.value))
    }

    if (form.value.authorUuid && authorList.value.some(author => author.id === form.value.authorUuid))
      form.value.authorId = form.value.authorUuid
    body.value = draftHtml.value
  } catch (err: unknown) {
    error.value = new Error(err instanceof Error ? err.message : 'Failed to load post')
    console.log('Failed to load post:', err)
  } finally {
    hasLoaded.value = true
  }
})

/** Methods */
async function persistDraft() {
  const canonicalURL = form.value.canonicalURL.trim()
  if (canonicalURL && !isAbsoluteHttpUrl(canonicalURL))
    throw new Error('Canonical URL must be an absolute http(s) URL.')
  const ogImageURL = form.value.ogImageURL.trim()
  if (ogImageURL && !isAbsoluteHttpUrl(ogImageURL))
    throw new Error('Social image URL must be an absolute http(s) URL.')

  const tags = [...form.value.tags]
  const title = form.value.title.trim()
  const seo = postSeoPayload(form.value)
  const series = postSeriesPayload(form.value, seriesList.value)
  const featured = postFeaturedPayload(form.value)
  const selected = selectedAuthor.value
  const authorFields: Partial<IPost> = selected
    ? {
        authorUuid: selected.id,
        authorName: selected.name,
        authorPhotoURL: selected.photoURL ?? '',
        authorSlug: selected.slug ?? ''
      }
    : {
        authorName: form.value.authorName,
        ...(form.value.authorUuid ? { authorUuid: form.value.authorUuid } : {})
      }
  if (series.create)
    await createSeries(series.create)
  await saveMeta({
    title: form.value.title,
    shortText: form.value.shortText,
    ...authorFields,
    imageURL: form.value.imageURL,
    imageAlt: form.value.imageAlt.trim() || title,
    color: form.value.color,
    tags,
    ...seo.fields,
    ...series.fields,
    ...featured.fields
  }, [...seo.removed, ...series.removed, ...featured.removed])
  await saveDraft(body.value)
  if (form.value.isNewSeries) {
    Object.assign(form.value, { isNewSeries: false, seriesSlug: series.fields.seriesSlug ?? '', newSeriesName: '', newSeriesDescription: '' })
    await fetchSeries()
  }
}
async function onSaveDraft() {
  try {
    await persistDraft()
    onToastMessage('success', 'Draft saved')
  } catch (err: any) {
    onToastMessage('danger', err?.message || 'Failed to save.')
  }
}
async function runWorkflow(action: () => Promise<IPostWorkflowResponse>, success: string, fallback: string, saveFirst = false): Promise<boolean> {
  try {
    if (saveFirst)
      await persistDraft()
    applyWorkflow(await action())
    onToastMessage('success', success)
    if (isAdmin.value)
      refreshReviewCount()
    return true
  } catch (err: unknown) {
    onToastMessage('danger', workflowErrorMessage(err, fallback))
    return false
  }
}
function onPublish() {
  return runWorkflow(() => workflow.publish(slug.value), status.value === 'review' ? 'Approved and published' : 'Published', 'Failed to publish.', true)
}
function openSchedule() {
  publishDialog.value?.showDialog('schedule', toMillis(meta.value?.publishAt) || null)
}
async function onConfirmPublish(publishAt: number | null) {
  const message = publishAt ? 'Scheduled' : (status.value === 'review' ? 'Approved and published' : 'Published')
  if (await runWorkflow(() => workflow.publish(slug.value, publishAt), message, publishAt ? 'Failed to schedule.' : 'Failed to publish.', true))
    publishDialog.value?.closeDialog()
}
function onSubmit(note = '') {
  return runWorkflow(() => workflow.submit(slug.value, note), status.value === 'changes' ? 'Resubmitted for review' : 'Submitted for review', 'Failed to submit.', true)
}
function onWithdraw() {
  return runWorkflow(() => workflow.withdraw(slug.value), 'Withdrawn from review', 'Failed to withdraw.')
}
function onResolve() {
  return runWorkflow(() => workflow.resolve(slug.value), 'Marked resolved', 'Failed to update the note.')
}
function onUnpublish() {
  return runWorkflow(() => workflow.unpublish(slug.value), 'Unpublished', 'Failed to unpublish.')
}
function onCancelSchedule() {
  return runWorkflow(() => workflow.unpublish(slug.value), 'Schedule cancelled', 'Failed to cancel the schedule.')
}
function openRequestChanges() {
  requestChangesError.value = null
  requestChangesSheet.value?.showDialog()
}
async function onRequestChanges(payload: { note: string, reasons: string[] }) {
  requestChangesError.value = null
  try {
    applyWorkflow(await workflow.requestChanges(slug.value, payload.note, payload.reasons))
    requestChangesSheet.value?.closeDialog()
    onToastMessage('success', 'Sent back to the author')
    refreshReviewCount()
  } catch (err: unknown) {
    requestChangesError.value = workflowErrorMessage(err, 'Failed to request changes.')
  }
}
async function openHistory() {
  historySheet.value?.showDialog()
  isLoadingHistory.value = true
  historyError.value = null
  try {
    historyEvents.value = (await workflow.fetchEvents(slug.value)).events
  } catch (err: unknown) {
    historyError.value = workflowErrorMessage(err, 'Failed to load the history.')
  } finally {
    isLoadingHistory.value = false
  }
}
</script>

<template>
  <div class="container">
    <!-- Header -->
    <UiHeaderContent
      title="Edit post"
      :subtitle="`Edit the ${form.title || slug} post`"
      back-button back-button-label="Go back"
      view-transition-name="selected-headline"
      @back="navigateTo('/posts')"
    >
      <template #actions>
        <UiButtonGroup>
          <div class="align-self-center">
            <AppPostsStatusBadge :status="status" />
          </div>
          <UiButtonTooltip
            v-if="isPublished"
            variant="text"
            icon
            tooltip-text="View live"
            :href="`${blogUrl}/${slug}`"
            target="_blank"
            rel="noopener"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe89e;" />
            </template>
          </UiButtonTooltip>
          <AppPostsAiToolbar />
          <UiButtonTooltip
            variant="outline"
            tooltip-text="Save draft"
            icon
            rounded
            :disabled="!meta || isBusy"
            @click="onSaveDraft"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe7b3;" />
            </template>
          </UiButtonTooltip>
          <template v-if="isAdmin">
            <UiButtonGroup connected>
              <UiButton
                variant="filled"
                :text="publishLabel"
                :loading="workflow.pending.value === 'publish'"
                :disabled="!meta || isBusy"
                @click="onPublish"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe2c6;" />
                </template>
              </UiButton>
              <UiButtonMenu
                id="post-publish-options"
                variant="filled"
                icon
                tooltip-text="More publish options"
                aria-label="More publish options"
                :disabled="!meta || isBusy"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe5cf;" />
                </template>
                <template #menu>
                  <UiButtonMenuItem
                    icon="&#xe8b5;"
                    :item-text="status === 'scheduled' ? 'Reschedule…' : 'Schedule…'"
                    :disabled="isPublished"
                    @click="openSchedule"
                  />
                  <template v-if="status === 'review'">
                    <UiButtonMenuDivider />
                    <UiButtonMenuItem
                      icon="&#xe0b9;"
                      item-text="Request changes"
                      @click="openRequestChanges"
                    />
                  </template>
                </template>
              </UiButtonMenu>
            </UiButtonGroup>
          </template>
          <UiButton
            v-else
            variant="filled"
            :text="submitLabel"
            :loading="workflow.pending.value === 'submit'"
            :disabled="!meta || isBusy || status === 'review' || status === 'scheduled'"
            @click="onSubmit()"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe163;" />
            </template>
          </UiButton>
        </UiButtonGroup>
      </template>
    </UiHeaderContent>

    <!-- Error -->
    <UiAlert
      v-if="error"
      type="tonal"
      variant="danger"
      size="sm"
      :message="`${error}`"
      class="mb-3"
    />

    <!-- Loading -->
    <AppPostsFormSkeleton v-if="isFetching && !meta" />

    <!-- Form -->
    <form
      v-else-if="meta"
      id="post-form"
      action="#"
      class="mb-3"
      @submit.prevent="onSaveDraft"
    >
      <AppPostsForm
        v-model:form="form"
        v-model:body="body"
        :slug="slug"
        :authors="authorList"
        :tags="tagList"
        :series="seriesList"
        :is-published="isPublished"
        :is-saving="isBusy"
        :can-unpublish="isAdmin"
        @unpublish="onUnpublish"
      >
        <template #status>
          <AppPostsStatusCard
            :post="meta"
            :role="adminRole"
            :current-uid="currentUser?.uid ?? null"
            :pending="workflow.pending.value"
            :disabled="isSaving"
            @submit="onSubmit"
            @withdraw="onWithdraw"
            @resolve="onResolve"
            @publish="onPublish"
            @schedule="openSchedule"
            @request-changes="openRequestChanges"
            @cancel-schedule="onCancelSchedule"
            @history="openHistory"
          />
          <AppPostsPerformanceCard
            :slug="slug"
            :is-published="isPublished"
            :published-at="meta.createdAt"
          />
        </template>
      </AppPostsForm>
    </form>

    <!-- Not found -->
    <UiEmpty
      v-else
      title="Post not found"
      subtitle="It may have been deleted or the link is wrong"
      use-custom-icon
      icon-code="&#xea76;"
    />

    <!-- Dialogs -->
    <AppPostsPublishDialog
      ref="publishDialog"
      :post-title="form.title || slug"
      :is-approval="status === 'review'"
      :can-schedule="!isPublished"
      :is-loading="workflow.pending.value === 'publish'"
      @confirm="onConfirmPublish"
    />
    <AppPostsRequestChangesSheet
      ref="requestChangesSheet"
      :post-title="form.title || slug"
      :is-loading="workflow.pending.value === 'request-changes'"
      :error-message="requestChangesError"
      @send="onRequestChanges"
    />
    <AppPostsHistorySheet
      ref="historySheet"
      :post-title="form.title || slug"
      :events="historyEvents"
      :is-loading="isLoadingHistory"
      :error-message="historyError"
      :current-uid="currentUser?.uid ?? null"
    />

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </div>
</template>
