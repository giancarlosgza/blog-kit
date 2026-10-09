<script setup lang="ts">
import type { IDialogDisplay, UiAlertToast } from '@colorffy/ui'
import type AppTagsDialog from '#admin/app/components/app/tags/TagsDialog.vue'
import type { ITag } from '#admin/shared/models/tag'
import { useToast } from '@colorffy/ui'
import { deleteDoc, doc } from 'firebase/firestore'

/** Head */
const runtimeConfig = useRuntimeConfig()
const { blogName } = useAppConfig().admin
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined

definePageMeta({
  pageTitle: 'Tags',
  middleware: ['auth']
})
useSeoMeta({
  title: 'Tags',
  description: `Manage ${blogName} tags.`,
  ogTitle: 'Tags',
  ogDescription: `Manage ${blogName} tags.`,
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Tags',
  twitterDescription: `Manage ${blogName} tags.`,
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
const db = useFirestore()
const selectedTag = ref<ITag | null>(null)
const isDeleting = ref<boolean>(false)
const tagDialog = useTemplateRef<InstanceType<typeof AppTagsDialog>>('tagDialog')
const confirmDeleteDialog = ref<IDialogDisplay | null>(null)

/** Composables */
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)
const { isSyncing, syncTagCounts } = useSyncTagCounts()
const {
  documents: tags,
  error,
  isLoading,
  isLoadingMore,
  hasMoreDocs,
  hasNotDocs,
  fetchDocs: fetchTags,
  loadMoreDocs
} = useFirebaseCollection<ITag>({
  collectionPath: 'tags',
  orderByField: 'name',
  orderDirection: 'asc',
  docsLimit: 200
})

/** Computed */
const selectedTagName = computed(() => selectedTag.value?.name ?? 'this tag')

/** Lifecycle */
onMounted(() => fetchTags())

/** Methods */
function openCreate() {
  tagDialog.value?.showDialog()
}
function openEdit(tag: ITag) {
  tagDialog.value?.showDialog(tag)
}
async function onTagSaved(message: string) {
  onToastMessage('success', message)
  await fetchTags()
}
function askDelete(tag: ITag) {
  selectedTag.value = tag
  confirmDeleteDialog.value?.showDialog()
}
async function onSyncCounts() {
  try {
    const { updated } = await syncTagCounts()
    onToastMessage('success', updated > 0 ? `Synced ${updated} tag${updated === 1 ? '' : 's'}` : 'Counts already up to date')
    await fetchTags()
  } catch (err: unknown) {
    onToastMessage('danger', err instanceof Error ? err.message : 'Failed to sync tag counts.')
  }
}
async function confirmDelete() {
  if (!selectedTag.value?.id)
    return

  isDeleting.value = true
  try {
    await deleteDoc(doc(db, 'tags', selectedTag.value.id))
    onToastMessage('success', 'Tag deleted successfully')
    confirmDeleteDialog.value?.closeDialog()
    await fetchTags()
  } catch (err: unknown) {
    onToastMessage('danger', err instanceof Error ? err.message : 'Failed to delete tag.')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="container-fluid mb-5">
    <!-- Header -->
    <UiHeaderContent
      title="Tags"
      subtitle="Create and manage the tags used to organize posts"
      view-transition-name="selected-headline"
      hide-actions-when-narrow
    >
      <template #actions>
        <UiButtonGroup connected>
          <UiButton
            variant="tonal"
            color="secondary"
            :text="isSyncing ? 'Syncing...' : 'Sync tag counts'"
            :loading="isSyncing"
            @click="onSyncCounts"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe863;" />
            </template>
          </UiButton>
          <UiButton
            variant="filled"
            text="Create tag"
            @click="openCreate"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe145;" />
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
      class="mb-1"
    />

    <!-- Layouts -->
    <UiCard
      v-if="tags"
      variant="pane"
    >
      <template #body>
        <AppTagsTable
          :tags="tags"
          :is-loading="isLoading"
          @edit="openEdit"
          @delete="askDelete"
        />
      </template>
    </UiCard>

    <!-- Load more -->
    <div class="d-grid grid-repeat-cols-1 align-items-center gap-3 mt-section mt-section-md">
      <div class="text-decoration-side-lines">
        <UiButton
          v-if="!hasNotDocs"
          variant="outline"
          class="hover-rotate"
          :text="!hasMoreDocs ? 'No more tags' : 'Show more'"
          aria-label="Show more tags"
          :aria-busy="isLoadingMore"
          :disabled="!hasMoreDocs || isLoadingMore"
          @click="loadMoreDocs"
        >
          <template #icon>
            <UiIconMaterial :icon-code="!hasMoreDocs ? '&#xea76;' : '&#xe863;'" />
          </template>
        </UiButton>
      </div>
      <div class="justify-items-md-end">
        <p class="subtitle-2 text-muted mb-0">
          Showing {{ tags?.length }} tags
        </p>
      </div>
    </div>

    <!-- FAB -->
    <div class="fab-group">
      <UiButton
        variant="gradient"
        custom-class="btn-fab fab-mobile"
        aria-label="Create tag"
        @click="openCreate"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe145;" />
        </template>
      </UiButton>
      <UiButton
        variant="tonal"
        color="secondary"
        custom-class="btn-fab fab-mobile"
        aria-label="Sync tag counts"
        :loading="isSyncing"
        @click="onSyncCounts"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe863;" />
        </template>
      </UiButton>
    </div>

    <!-- Dialogs -->
    <AppTagsDialog
      ref="tagDialog"
      @saved="onTagSaved"
    />
    <UiConfirmModal
      ref="confirmDeleteDialog"
      variant="danger"
      :title="`Delete ${selectedTagName}?`"
      :message="`Are you sure you want to delete the '${selectedTagName}' tag? Posts already using it keep the tag name.`"
      confirm-label="Yes, delete"
      loading-label="Deleting..."
      :is-loading="isDeleting"
      @confirm="confirmDelete"
    />

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </div>
</template>
