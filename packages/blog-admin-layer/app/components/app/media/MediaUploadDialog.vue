<script setup lang="ts">
import type { IChipOption, IDialogDisplay } from '@colorffy/ui'
import type { MediaFolder } from '#admin/shared/models/media'
import { MEDIA_FOLDERS } from '#admin/shared/models/media'

/** Interfaces */
interface IMediaUploadDialogEmits {
  uploaded: [url: string]
}

/** Emit */
const emit = defineEmits<IMediaUploadDialogEmits>()

/** Data */
const DEFAULT_FOLDER: MediaFolder = 'posts'
const DEFAULT_SUBFOLDER = 'misc'
const dialogRef = ref<IDialogDisplay | null>(null)
const folder = ref<MediaFolder>(DEFAULT_FOLDER)
const subfolder = ref<string>(DEFAULT_SUBFOLDER)
const file = ref<File | null>(null)
const folderOptions: IChipOption[] = MEDIA_FOLDERS.map(item => ({ id: item, text: item }))

/** Composables */
const { isUploading, progress, error, upload } = useImageUpload()

/** Computed */
const normalizedSubfolder = computed<string>(() => toSlug(subfolder.value) || DEFAULT_SUBFOLDER)
const targetPath = computed<string>(() => `${folder.value}/${normalizedSubfolder.value}`)
const isUploadDisabled = computed<boolean>(() => !file.value || isUploading.value)

/** Methods */
function selectFolder(value: string | string[] | null): void {
  const next = Array.isArray(value) ? value[0] : value
  if (next && (MEDIA_FOLDERS as readonly string[]).includes(next))
    folder.value = next as MediaFolder
}
async function startUpload(): Promise<void> {
  if (!file.value || isUploadDisabled.value)
    return
  try {
    const url = await upload(file.value, targetPath.value)
    emit('uploaded', url)
    closeDialog()
  } catch {
  }
}
function showDialog(initialFolder: MediaFolder | null = null): void {
  folder.value = initialFolder ?? DEFAULT_FOLDER
  subfolder.value = DEFAULT_SUBFOLDER
  file.value = null
  error.value = ''
  dialogRef.value?.showDialog()
}
function closeDialog(): void {
  dialogRef.value?.closeDialog()
}

defineExpose({
  showDialog,
  closeDialog
})
</script>

<template>
  <UiModal
    ref="dialogRef"
    mode="side-sheet"
    class="dialog-backdrop-blur media-sheet"
    aria-labelledby="media-upload-title"
    aria-describedby="media-upload-description"
  >
    <template #header>
      <div class="media-detail-heading">
        <h2
          id="media-upload-title"
          class="dialog-title fs-base fw-800 mb-0"
        >
          Upload image
        </h2>
        <p
          id="media-upload-description"
          class="fs-3xs text-muted mb-0"
        >
          Raster images are converted to WebP before upload
        </p>
      </div>
      <UiButton
        variant="outline"
        title="Close upload dialog"
        aria-label="Close upload dialog"
        icon
        size="sm"
        @click="closeDialog"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5cd;" />
        </template>
      </UiButton>
    </template>
    <template #body>
      <form
        id="media-upload-form"
        action="#"
        class="media-sheet-body"
        @submit.prevent="startUpload"
      >
        <section
          aria-labelledby="media-upload-folder"
          class="d-grid gap-2"
        >
          <UiSubheadingContent
            id="media-upload-folder"
            title="Folder"
            as="h3"
            gutter="none"
          />
          <UiChipGroup
            :options="folderOptions"
            :model-value="folder"
            variant="outline"
            color="secondary"
            aria-label="Upload folder"
            @update:model-value="selectFolder"
          />
        </section>
        <div class="d-grid gap-2">
          <UiInputText
            id="media-upload-subfolder"
            v-model="subfolder"
            label="Subfolder"
            placeholder="misc"
            size="sm"
            class="mb-0"
          />
          <p class="fs-3xs text-muted mb-0">
            Saved to <span class="font-code">{{ targetPath }}/</span>
          </p>
        </div>
        <UiInputFile
          id="media-upload-file"
          v-model="file"
          label="Image"
          input-label="Drop or select an image"
          accept="image/*"
          size="sm"
          class="mb-0"
        />
        <UiAlert
          v-if="isUploading"
          type="tonal"
          variant="info"
          size="sm"
          :message="`Uploading... ${progress}%`"
        />
        <UiAlert
          v-else-if="error"
          type="tonal"
          variant="danger"
          size="sm"
          :message="error"
        />
      </form>
    </template>
    <template #footer>
      <UiButton
        variant="text"
        class="text-neutral"
        text="Cancel"
        @click="closeDialog"
      />
      <UiButton
        type="submit"
        form="media-upload-form"
        variant="filled"
        :text="isUploading ? 'Uploading…' : 'Upload'"
        :disabled="isUploadDisabled"
        :loading="isUploading"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe2c6;" />
        </template>
      </UiButton>
    </template>
  </UiModal>
</template>
