<script setup lang="ts">
import type { IDialogDisplay } from '@colorffy/ui'
import type { IMediaFile } from '#admin/shared/models/media'
import { formatBytes } from '#admin/shared/utils/media'

/** Interfaces */
interface IMediaDeleteDialogProps {
  files: IMediaFile[]
  isLoading?: boolean
}
interface IMediaDeleteDialogEmits {
  confirm: []
}

/** Props */
const props = withDefaults(defineProps<IMediaDeleteDialogProps>(), {
  isLoading: false
})

/** Emit */
const emit = defineEmits<IMediaDeleteDialogEmits>()

/** Data */
const PREVIEW_LIMIT = 50
const dialogRef = ref<IDialogDisplay | null>(null)

/** Computed */
const count = computed<number>(() => props.files.length)
const noun = computed<string>(() => count.value === 1 ? 'file' : 'files')
const freedBytes = computed<number>(() => props.files.reduce((sum, file) => sum + file.size, 0))
const previewFiles = computed<IMediaFile[]>(() => props.files.slice(0, PREVIEW_LIMIT))
const summary = computed<string>(() => {
  const hidden = count.value - previewFiles.value.length
  const freed = `frees ${formatBytes(freedBytes.value)}`
  return hidden > 0 ? `…and ${hidden} more · ${freed}` : `${count.value} ${noun.value} · ${freed}`
})

/** Methods */
function showDialog(): void {
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
  <UiConfirmModal
    ref="dialogRef"
    variant="danger"
    :title="`Delete ${count} unused ${noun}?`"
    message="These files aren’t used by any post, author, logo or SEO image. This can’t be undone."
    :confirm-label="`Delete ${count} ${noun}`"
    loading-label="Deleting..."
    cancel-label="Cancel"
    :is-loading="props.isLoading"
    custom-class="media-delete-dialog"
    @confirm="emit('confirm')"
  >
    <template #messages>
      <ul class="media-delete-list">
        <li
          v-for="file in previewFiles"
          :key="file.path"
        >
          <span
            class="font-code"
            :title="file.path"
          >{{ file.path }}</span>
          <span class="font-code text-muted">{{ formatBytes(file.size) }}</span>
        </li>
      </ul>
      <p class="fs-3xs text-muted mb-0">
        {{ summary }}
      </p>
    </template>
  </UiConfirmModal>
</template>
