<script setup lang="ts">
import type { IDialogDisplay } from '@colorffy/ui'
import { REVIEW_NOTE_MAX, REVIEW_REASONS } from '#admin/shared/utils/post-status'

/** Interfaces */
interface IProps {
  postTitle?: string | null
  isLoading?: boolean
  errorMessage?: string | null
}
interface IEmits {
  send: [payload: { note: string, reasons: string[] }]
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  postTitle: null,
  isLoading: false,
  errorMessage: null
})

/** Emit */
const emit = defineEmits<IEmits>()

/** Data */
const dialogRef = ref<IDialogDisplay | null>(null)
const note = ref<string>('')
const reasons = ref<string[]>([])
const reasonOptions = REVIEW_REASONS.map(reason => ({ id: reason, text: reason }))

/** Computed */
const trimmedNote = computed(() => note.value.trim())
const isSendDisabled = computed(() => !trimmedNote.value || trimmedNote.value.length > REVIEW_NOTE_MAX || props.isLoading)
const noteCount = computed(() => `Required · ${note.value.length} / ${REVIEW_NOTE_MAX}`)

/** Methods */
function selectReasons(value: string | string[] | null): void {
  reasons.value = Array.isArray(value) ? value : value ? [value] : []
}
function send(): void {
  if (isSendDisabled.value)
    return
  emit('send', { note: trimmedNote.value, reasons: [...reasons.value] })
}
function showDialog(): void {
  note.value = ''
  reasons.value = []
  dialogRef.value?.showDialog()
  nextTick(() => document.getElementById('request-changes-note')?.focus())
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
    class="dialog-backdrop-blur workflow-sheet"
    aria-labelledby="request-changes-title"
    aria-describedby="request-changes-description"
  >
    <template #header>
      <div class="workflow-sheet-heading">
        <h2
          id="request-changes-title"
          class="dialog-title fs-base fw-800 mb-0"
        >
          Request changes
        </h2>
        <p
          id="request-changes-description"
          class="fs-3xs text-muted text-truncate mb-0"
          :title="props.postTitle ?? undefined"
        >
          {{ props.postTitle || 'Send the post back to its author' }}
        </p>
      </div>
      <UiButton
        variant="outline"
        title="Close request changes"
        aria-label="Close request changes"
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
        id="request-changes-form"
        action="#"
        class="workflow-sheet-body"
        @submit.prevent="send"
      >
        <UiAlert
          v-if="props.errorMessage"
          :message="props.errorMessage"
          type="tonal"
          variant="danger"
          size="sm"
        />
        <section
          aria-labelledby="request-changes-reasons"
          class="d-grid gap-2"
        >
          <h3
            id="request-changes-reasons"
            class="subtitle-2 fw-500 mb-0"
          >
            What needs work?
          </h3>
          <UiChipGroup
            :options="reasonOptions"
            :model-value="reasons"
            multiple
            variant="outline"
            color="secondary"
            aria-label="Quick reasons"
            @update:model-value="selectReasons"
          />
        </section>
        <div class="d-grid gap-1">
          <UiInputTextarea
            id="request-changes-note"
            v-model="note"
            label="Note to the author"
            placeholder="Ex. The cover needs alt text and the second section repeats the intro"
            :rows="6"
            :maxlength="REVIEW_NOTE_MAX"
            size="sm"
            class="mb-0"
            required
          />
          <p class="fs-4xs text-muted text-end mb-0">
            {{ noteCount }}
          </p>
        </div>
        <UiAlert
          type="tonal"
          variant="warning"
          size="sm"
          message="The post goes back to the author as Changes requested"
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
        form="request-changes-form"
        variant="filled"
        text="Send back"
        :loading="props.isLoading"
        :disabled="isSendDisabled"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe163;" />
        </template>
      </UiButton>
    </template>
  </UiModal>
</template>
