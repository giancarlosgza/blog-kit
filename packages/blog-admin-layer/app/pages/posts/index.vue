<script setup lang="ts">
import type { IDialogDisplay, UiAlertToast } from '@colorffy/ui'
import type AppPostsFiltersSideSheet from '#admin/app/components/app/posts/PostsFiltersSideSheet.vue'
import type { IPostFilters, PostSort, PostStatusFilter } from '#admin/app/utils/post-filters'
import type { IAuthor } from '#admin/shared/models/author'
import type { IPost, PostStatus } from '#admin/shared/models/post'
import type { ITag } from '#admin/shared/models/tag'
import { useToast } from '@colorffy/ui'
import { applyPostFilters, emptyPostFilters, hasActivePostFilters, mergePostFiltersQuery, parsePostFilters } from '#admin/app/utils/post-filters'
import { POST_STATUS_LABELS, resolvePostStatus } from '#admin/shared/utils/post-status'

/** Interfaces */
interface IDeletePostResponse {
  ok: boolean
  slug: string
  deletedFiles: number
}

/** Head */
const runtimeConfig = useRuntimeConfig()
const { blogName } = useAppConfig().admin
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined

definePageMeta({
  pageTitle: 'Posts',
  middleware: ['auth']
})
useSeoMeta({
  title: 'Posts',
  description: `Manage ${blogName} posts.`,
  ogTitle: 'Posts',
  ogDescription: `Manage ${blogName} posts.`,
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Posts',
  twitterDescription: `Manage ${blogName} posts.`,
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
const router = useRouter()
const isTableLayoutActive = useTableLayoutActive()
const selectedPost = ref<IPost | null>(null)
const isDeleting = ref<boolean>(false)
const confirmDeleteDialog = ref<IDialogDisplay | null>(null)
const filtersDialog = useTemplateRef<InstanceType<typeof AppPostsFiltersSideSheet>>('filtersDialog')

/** Composables */
const apiFetch = useApiFetch()
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)
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
const { documents: authors, fetchDocs: fetchAuthors } = useFirebaseCollection<IAuthor>({
  collectionPath: 'authors',
  orderByField: 'name',
  orderDirection: 'asc',
  docsLimit: null
})
const { documents: tags, fetchDocs: fetchTags } = useFirebaseCollection<ITag>({
  collectionPath: 'tags',
  orderByField: 'name',
  orderDirection: 'asc',
  docsLimit: null
})

/** Computed */
const filters = computed<IPostFilters>(() => parsePostFilters(route.query))
const hasFilterActive = computed<boolean>(() => hasActivePostFilters(filters.value))
const filteredPosts = computed<IPost[]>(() => applyPostFilters(posts.value, filters.value, authors.value))
const hasNoMatches = computed<boolean>(() => !isLoading.value && posts.value.length > 0 && !filteredPosts.value.length)
const postsSummary = computed<string>(() => (filteredPosts.value.length === posts.value.length
  ? `${posts.value.length} ${posts.value.length === 1 ? 'post' : 'posts'}`
  : `${filteredPosts.value.length} of ${posts.value.length} posts`))
const postsSummaryStats = computed(() => {
  const statuses = filteredPosts.value.map(post => resolvePostStatus(post))
  const countOf = (status: PostStatus) => statuses.filter(item => item === status).length.toLocaleString('en-US')
  return [
    { label: POST_STATUS_LABELS.published, value: countOf('published'), iconCode: '&#xe86c;', color: 'success' },
    { label: POST_STATUS_LABELS.scheduled, value: countOf('scheduled'), iconCode: '&#xe8b5;', color: 'secondary' },
    { label: POST_STATUS_LABELS.review, value: countOf('review'), iconCode: '&#xe560;', color: 'info' },
    { label: POST_STATUS_LABELS.changes, value: countOf('changes'), iconCode: '&#xe745;', color: 'warning' },
    { label: POST_STATUS_LABELS.draft, value: countOf('draft'), iconCode: '&#xe66d;', color: 'muted' }
  ]
})
const postsView = computed<'grid' | 'list'>({
  get: () => (isTableLayoutActive.value ? 'list' : 'grid'),
  set: (view) => {
    isTableLayoutActive.value = view === 'list'
  }
})
const selectedPostTitle = computed<string>(() => selectedPost.value?.title || selectedPost.value?.id || 'this post')
const searchQueryKeyword = computed({
  get: () => filters.value.q,
  set: (q: string | null) => updateFilters({ q })
})
const statusQueryKeyword = computed({
  get: () => filters.value.status,
  set: (status: PostStatusFilter | null) => updateFilters({ status })
})
const authorQueryKeyword = computed({
  get: () => filters.value.author,
  set: (author: string | null) => updateFilters({ author })
})
const tagQueryKeyword = computed({
  get: () => filters.value.tag,
  set: (tag: string | null) => updateFilters({ tag })
})
const sortByQueryKeyword = computed({
  get: () => filters.value.sort,
  set: (sort: PostSort) => updateFilters({ sort })
})

/** Lifecycle */
onMounted(() => Promise.all([fetchPosts(), fetchAuthors(), fetchTags()]))

/** Methods */
function updateFilters(updates: Partial<IPostFilters>): void {
  router.replace({ query: mergePostFiltersQuery(route.query, { ...filters.value, ...updates }) })
}
function clearAllFilters(): void {
  router.replace({ query: mergePostFiltersQuery(route.query, emptyPostFilters()) })
}
function openFiltersDialog(): void {
  filtersDialog.value?.showDialog()
}
function askDelete(post: IPost): void {
  selectedPost.value = post
  confirmDeleteDialog.value?.showDialog()
}
async function confirmDelete(): Promise<void> {
  const slug = selectedPost.value?.id ?? selectedPost.value?.slug
  if (!slug)
    return

  isDeleting.value = true
  try {
    const { deletedFiles } = await apiFetch<IDeletePostResponse>(`/api/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' })
    posts.value = posts.value.filter(post => (post.id ?? post.slug) !== slug)
    confirmDeleteDialog.value?.closeDialog()
    onToastMessage('success', deletedFiles > 0 ? `Post deleted with ${deletedFiles} image${deletedFiles === 1 ? '' : 's'}` : 'Post deleted')
    selectedPost.value = null
  } catch (err: any) {
    onToastMessage('danger', err?.data?.statusMessage || err?.statusMessage || err?.message || 'Failed to delete post.')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="container-fluid mb-5">
    <!-- Header -->
    <UiHeaderContent
      title="Posts"
      subtitle="Create and manage your blog articles"
      view-transition-name="selected-headline"
      hide-actions-when-narrow
    >
      <template #actions>
        <UiButton
          variant="filled"
          text="Create post"
          @click="navigateTo('/posts/new')"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe145;" />
          </template>
        </UiButton>
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

    <!-- Filters -->
    <UiCard
      variant="pane"
      class="list-filters"
    >
      <template #body>
        <AppPostsFilters
          v-model:search-query-keyword="searchQueryKeyword"
          v-model:status-query-keyword="statusQueryKeyword"
          v-model:author-query-keyword="authorQueryKeyword"
          v-model:tag-query-keyword="tagQueryKeyword"
          v-model:sort-by-query-keyword="sortByQueryKeyword"
          :authors="authors"
          :tags="tags"
          :has-filter-active="hasFilterActive"
          @clear-all="clearAllFilters"
          @open-filters-dialog="openFiltersDialog"
        >
          <template #actions>
            <AppListSummary
              id="posts-summary"
              title="Posts"
              item-label="posts"
              :shown="filteredPosts.length"
              :total="posts.length"
              :stats="postsSummaryStats"
            />
            <AppViewToggle
              v-model:view="postsView"
              list-label="Table view"
            />
          </template>
        </AppPostsFilters>
      </template>
    </UiCard>

    <!-- Posts -->
    <UiCard
      v-if="isTableLayoutActive || hasNoMatches"
      variant="pane"
      class="list-panel"
    >
      <template #body>
        <!-- Empty state -->
        <UiEmpty
          v-if="hasNoMatches"
          title="No posts match these filters"
          subtitle="Try a different search term, or clear the filters to see every post."
          use-custom-icon
          icon-code="&#xef42;"
        >
          <template #action>
            <UiButtonGroup class="justify-content-center">
              <UiButton
                variant="tonal"
                color="primary"
                text="Clear filters"
                class="btn-cta"
                @click="clearAllFilters"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe0b8;" />
                </template>
              </UiButton>
            </UiButtonGroup>
          </template>
        </UiEmpty>

        <!-- Table -->
        <AppPostsTable
          v-else
          :posts="filteredPosts"
          :is-loading="isLoading"
          :summary="postsSummary"
          @delete="askDelete"
        />
      </template>
    </UiCard>
    <AppPostsCardGrid
      v-else
      :posts="filteredPosts"
      :is-loading="isLoading"
      @delete="askDelete"
    />

    <!-- FAB -->
    <div class="fab-group">
      <UiButton
        variant="gradient"
        custom-class="btn-fab fab-mobile"
        aria-label="Create post"
        @click="navigateTo('/posts/new')"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe145;" />
        </template>
      </UiButton>
    </div>

    <!-- Dialogs -->
    <AppPostsFiltersSideSheet
      ref="filtersDialog"
      v-model:status-query-keyword="statusQueryKeyword"
      v-model:author-query-keyword="authorQueryKeyword"
      v-model:tag-query-keyword="tagQueryKeyword"
      v-model:sort-by-query-keyword="sortByQueryKeyword"
      :authors="authors"
      :tags="tags"
      :has-filter-active="hasFilterActive"
      @clear-all="clearAllFilters"
    />
    <UiConfirmModal
      ref="confirmDeleteDialog"
      variant="danger"
      :title="`Delete ${selectedPostTitle}?`"
      :message="`Are you sure you want to delete '${selectedPostTitle}'? Its published body, draft and uploaded images are removed too. This cannot be undone.`"
      confirm-label="Yes, delete"
      loading-label="Deleting..."
      :is-loading="isDeleting"
      @confirm="confirmDelete"
    />

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </div>
</template>
