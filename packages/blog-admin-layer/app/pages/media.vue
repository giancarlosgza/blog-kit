<script setup lang="ts">
import type { UiAlertToast } from '@colorffy/ui'
import type AppMediaDeleteDialog from '#admin/app/components/app/media/MediaDeleteDialog.vue'
import type AppMediaDetailSheet from '#admin/app/components/app/media/MediaDetailSheet.vue'
import type AppMediaUploadDialog from '#admin/app/components/app/media/MediaUploadDialog.vue'
import type { IMediaFilters, MediaSort, MediaUsageFilter, MediaView } from '#admin/app/utils/media-filters'
import type { AdminRole } from '#admin/shared/models/admin'
import type { IMediaDeleteResponse, IMediaFile, IMediaListResponse, MediaFolder, MediaUsageMap } from '#admin/shared/models/media'
import { useToast } from '@colorffy/ui'
import { applyMediaFilters, countMediaByFolder, emptyMediaFilters, hasActiveMediaFilters, mergeMediaFiltersQuery, parseMediaFilters } from '#admin/app/utils/media-filters'
import { formatBytes, isMediaInUse } from '#admin/shared/utils/media'

/** Head */
const runtimeConfig = useRuntimeConfig()
const { blogName } = useAppConfig().admin
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined

definePageMeta({
  pageTitle: 'Media',
  middleware: ['auth']
})
useSeoMeta({
  title: 'Media',
  description: `Browse and clean up ${blogName} images.`,
  ogTitle: 'Media',
  ogDescription: `Browse and clean up ${blogName} images.`,
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Media',
  twitterDescription: `Browse and clean up ${blogName} images.`,
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
const adminRole = useState<AdminRole | null>('adminRole', () => null)
const files = ref<IMediaFile[]>([])
const usage = ref<MediaUsageMap>({})
const scannedAt = ref<number | null>(null)
const isLoading = ref<boolean>(true)
const isDeleting = ref<boolean>(false)
const error = ref<string | null>(null)
const selected = ref<string[]>([])
const activeFile = ref<IMediaFile | null>(null)
const pendingDelete = ref<IMediaFile[]>([])
const detailSheet = useTemplateRef<InstanceType<typeof AppMediaDetailSheet>>('detailSheet')
const deleteDialog = useTemplateRef<InstanceType<typeof AppMediaDeleteDialog>>('deleteDialog')
const uploadDialog = useTemplateRef<InstanceType<typeof AppMediaUploadDialog>>('uploadDialog')

/** Composables */
const apiFetch = useApiFetch()
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)
const { formatDate } = useAdminDateFormat()

/** Computed */
const isAdmin = computed<boolean>(() => adminRole.value === 'admin')
const filters = computed<IMediaFilters>(() => parseMediaFilters(route.query))
const hasFilterActive = computed<boolean>(() => hasActiveMediaFilters(filters.value))
const folderCounts = computed(() => countMediaByFolder(files.value))
const folderFiles = computed<IMediaFile[]>(() => filters.value.folder ? files.value.filter(file => file.folder === filters.value.folder) : files.value)
const usedCount = computed<number>(() => folderFiles.value.filter(file => isMediaInUse(file.path, usage.value)).length)
const unusedFiles = computed<IMediaFile[]>(() => files.value.filter(file => !isMediaInUse(file.path, usage.value)))
const filteredFiles = computed<IMediaFile[]>(() => applyMediaFilters(files.value, filters.value, usage.value))
const totalBytes = computed<number>(() => files.value.reduce((sum, file) => sum + file.size, 0))
const hasNoFiles = computed<boolean>(() => !isLoading.value && !error.value && !files.value.length)
const hasLoadError = computed<boolean>(() => !isLoading.value && !!error.value && !files.value.length)
const hasNoMatches = computed<boolean>(() => !isLoading.value && files.value.length > 0 && !filteredFiles.value.length)
const activeUsages = computed(() => activeFile.value ? usage.value[activeFile.value.path] ?? [] : [])
const selectedFiles = computed<IMediaFile[]>(() => {
  const paths = new Set(selected.value)
  return files.value.filter(file => paths.has(file.path))
})
const selectedUnused = computed<IMediaFile[]>(() => selectedFiles.value.filter(file => !isMediaInUse(file.path, usage.value)))
const headerSubtitle = computed<string>(() => !files.value.length && (isLoading.value || error.value)
  ? 'Images uploaded to the blog'
  : `${files.value.length} ${files.value.length === 1 ? 'file' : 'files'} · ${formatBytes(totalBytes.value)}`)
const scanSummary = computed<string>(() => {
  const unused = folderFiles.value.length - usedCount.value
  const scanned = scannedAt.value ? ` · usage scanned ${formatDate(scannedAt.value)}` : ''
  return `${unused} unused ${unused === 1 ? 'file' : 'files'}${scanned}`
})
const searchQueryKeyword = computed({
  get: () => filters.value.q,
  set: (q: string | null) => updateFilters({ q })
})
const folderQueryKeyword = computed({
  get: () => filters.value.folder,
  set: (folder: MediaFolder | null) => updateFilters({ folder })
})
const usageQueryKeyword = computed({
  get: () => filters.value.usage,
  set: (usageFilter: MediaUsageFilter | null) => updateFilters({ usage: usageFilter })
})
const sortByQueryKeyword = computed({
  get: () => filters.value.sort,
  set: (sort: MediaSort) => updateFilters({ sort })
})
const viewQueryKeyword = computed({
  get: () => filters.value.view,
  set: (view: MediaView) => updateFilters({ view })
})

/** Lifecycle */
onMounted(() => fetchMedia())

/** Methods */
function errorMessage(err: any, fallback: string): string {
  return err?.data?.statusMessage || err?.statusMessage || err?.message || fallback
}
async function fetchMedia(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    const response = await apiFetch<IMediaListResponse>('/api/media')
    files.value = response.files
    usage.value = response.usage
    scannedAt.value = response.scannedAt
    const known = new Set(response.files.map(file => file.path))
    selected.value = selected.value.filter(path => known.has(path))
  } catch (err: any) {
    error.value = errorMessage(err, 'Failed to load media.')
  } finally {
    isLoading.value = false
  }
}
function updateFilters(updates: Partial<IMediaFilters>): void {
  router.replace({ query: mergeMediaFiltersQuery(route.query, { ...filters.value, ...updates }) })
}
function clearAllFilters(): void {
  router.replace({ query: mergeMediaFiltersQuery(route.query, emptyMediaFilters(filters.value.view)) })
}
function toggleSelected(path: string): void {
  selected.value = selected.value.includes(path)
    ? selected.value.filter(item => item !== path)
    : [...selected.value, path]
}
function openFile(file: IMediaFile): void {
  activeFile.value = file
  detailSheet.value?.showDialog()
}
function openUpload(): void {
  uploadDialog.value?.showDialog(filters.value.folder)
}
function askDelete(targets: IMediaFile[]): void {
  pendingDelete.value = targets.filter(file => !isMediaInUse(file.path, usage.value))
  if (pendingDelete.value.length)
    deleteDialog.value?.showDialog()
}
function askDeleteFile(file: IMediaFile): void {
  detailSheet.value?.closeDialog()
  askDelete([file])
}
async function copyText(text: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    onToastMessage('success', message)
  } catch {
    onToastMessage('danger', 'Could not copy to the clipboard.')
  }
}
function copySelectedUrls(): void {
  const urls = selectedFiles.value.map(file => file.url).filter(Boolean)
  if (!urls.length) {
    onToastMessage('warning', 'The selected files have no download URLs.')
    return
  }
  copyText(urls.join('\n'), `Copied ${urls.length} ${urls.length === 1 ? 'URL' : 'URLs'}`)
}
async function onUploaded(): Promise<void> {
  onToastMessage('success', 'Image uploaded')
  await fetchMedia()
}
async function confirmDelete(): Promise<void> {
  const paths = pendingDelete.value.map(file => file.path)
  if (!paths.length)
    return

  isDeleting.value = true
  try {
    const { deleted, skipped } = await apiFetch<IMediaDeleteResponse>('/api/media', { method: 'DELETE', body: { paths } })
    const removed = new Set(deleted)
    files.value = files.value.filter(file => !removed.has(file.path))
    selected.value = selected.value.filter(path => !removed.has(path))
    deleteDialog.value?.closeDialog()
    pendingDelete.value = []
    const inUse = skipped.filter(item => item.reason === 'in-use').length
    const note = inUse ? ` · ${inUse} now in use, kept` : ''
    onToastMessage(inUse ? 'warning' : 'success', `Deleted ${deleted.length} ${deleted.length === 1 ? 'file' : 'files'}${note}`)
    if (inUse)
      await fetchMedia()
  } catch (err: any) {
    deleteDialog.value?.closeDialog()
    onToastMessage('danger', errorMessage(err, 'Failed to delete files.'))
    await fetchMedia()
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="container-fluid mb-5">
    <!-- Header -->
    <UiHeaderContent
      title="Media"
      :subtitle="headerSubtitle"
      hide-actions-when-narrow
      view-transition-name="selected-headline"
    >
      <template #actions>
        <UiButtonGroup connected>
          <UiButton
            v-if="isAdmin"
            variant="tonal"
            color="danger"
            :text="`Delete unused (${unusedFiles.length})`"
            :disabled="!unusedFiles.length || isLoading"
            @click="askDelete(unusedFiles)"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe872;" />
            </template>
          </UiButton>
          <UiButton
            variant="filled"
            text="Upload"
            @click="openUpload"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe2c6;" />
            </template>
          </UiButton>
        </UiButtonGroup>
      </template>
    </UiHeaderContent>

    <!-- Error -->
    <UiAlert
      v-if="error && !hasLoadError"
      type="tonal"
      variant="danger"
      size="sm"
      :message="error"
      class="mb-3"
    />
    <div
      v-if="hasLoadError"
      class="mt-section mt-section-xl"
    >
      <UiEmpty
        title="Couldn’t load media"
        :subtitle="error ?? undefined"
        use-custom-icon
        icon-code="&#xe000;"
      >
        <template #action>
          <UiButtonGroup class="justify-content-center">
            <UiButton
              variant="tonal"
              color="primary"
              text="Try again"
              class="btn-cta"
              @click="fetchMedia"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe863;" />
              </template>
            </UiButton>
          </UiButtonGroup>
        </template>
      </UiEmpty>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="hasNoFiles"
      class="mt-section mt-section-xl"
    >
      <UiEmpty
        title="No media yet"
        subtitle="Images uploaded from posts, authors and branding show up here."
        use-custom-icon
        icon-code="&#xe3f4;"
      >
        <template #action>
          <UiButtonGroup class="justify-content-center">
            <UiButton
              variant="tonal"
              color="primary"
              text="Upload image"
              class="btn-cta"
              @click="openUpload"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe2c6;" />
              </template>
            </UiButton>
          </UiButtonGroup>
        </template>
      </UiEmpty>
    </div>

    <!-- Library -->
    <div
      v-else
      class="media-layout"
    >
      <AppMediaFolders
        v-model:folder="folderQueryKeyword"
        :counts="folderCounts"
      />

      <UiCard
        variant="pane"
        class="media-content"
      >
        <template #body>
          <div class="d-grid gap-3">
            <AppMediaToolbar
              v-model:search-query-keyword="searchQueryKeyword"
              v-model:usage-query-keyword="usageQueryKeyword"
              v-model:sort-by-query-keyword="sortByQueryKeyword"
              v-model:view-query-keyword="viewQueryKeyword"
              :used-count="usedCount"
              :unused-count="folderFiles.length - usedCount"
              :has-filter-active="hasFilterActive"
              @clear-all="clearAllFilters"
            />
            <div class="d-flex align-items-center justify-content-between gap-2">
              <UiBaseSkeleton
                v-if="isLoading && !files.length"
                size="sm"
                width="14rem"
              />
              <p
                v-else
                class="fs-3xs text-muted mb-0"
              >
                {{ scanSummary }}
              </p>
              <UiButtonTooltip
                variant="text"
                icon
                size="sm"
                custom-class="text-neutral"
                tooltip-text="Rescan usage"
                aria-label="Reload files and rescan usage"
                :loading="isLoading"
                :disabled="isLoading"
                @click="fetchMedia"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe863;" />
                </template>
              </UiButtonTooltip>
            </div>

            <UiEmpty
              v-if="hasNoMatches"
              title="No files match these filters"
              subtitle="Try another search or folder, or clear the filters to see every file."
              use-custom-icon
              icon-code="&#xe3f4;"
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
            <AppMediaTable
              v-else-if="filters.view === 'list'"
              v-model:selected="selected"
              :files="filteredFiles"
              :usage="usage"
              :is-loading="isLoading"
              @open="openFile"
            />
            <AppMediaGrid
              v-else
              :files="filteredFiles"
              :usage="usage"
              :selected="selected"
              :is-loading="isLoading"
              @open="openFile"
              @toggle="toggleSelected"
            />
          </div>
        </template>
      </UiCard>
    </div>

    <!-- Selection -->
    <AppMediaSelectionBar
      :count="selected.length"
      :deletable-count="selectedUnused.length"
      :can-delete="isAdmin"
      @copy="copySelectedUrls"
      @delete="askDelete(selectedUnused)"
      @clear="selected = []"
    />

    <!-- FAB -->
    <div
      v-show="!selected.length"
      class="fab-group"
    >
      <UiButton
        variant="gradient"
        custom-class="btn-fab fab-mobile"
        aria-label="Upload image"
        @click="openUpload"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe2c6;" />
        </template>
      </UiButton>
      <UiButton
        v-if="isAdmin && unusedFiles.length"
        variant="tonal"
        color="secondary"
        custom-class="btn-fab fab-mobile"
        :aria-label="`Delete ${unusedFiles.length} unused files`"
        @click="askDelete(unusedFiles)"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe872;" />
        </template>
      </UiButton>
    </div>

    <!-- Dialogs -->
    <AppMediaDetailSheet
      ref="detailSheet"
      :file="activeFile"
      :usages="activeUsages"
      :can-delete="isAdmin"
      :is-deleting="isDeleting"
      @copy="copyText($event, 'URL copied')"
      @delete="askDeleteFile"
    />
    <AppMediaDeleteDialog
      ref="deleteDialog"
      :files="pendingDelete"
      :is-loading="isDeleting"
      @confirm="confirmDelete"
    />
    <AppMediaUploadDialog
      ref="uploadDialog"
      @uploaded="onUploaded"
    />

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </div>
</template>
