<script setup lang="ts">
import type { IDialogDisplay } from '@colorffy/ui'

/** Interfaces */
type PublishMode = 'now' | 'schedule'
interface IProps {
  postTitle?: string | null
  isApproval?: boolean
  canSchedule?: boolean
  isLoading?: boolean
}
interface IEmits {
  confirm: [publishAt: number | null]
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  postTitle: null,
  isApproval: false,
  canSchedule: true,
  isLoading: false
})

/** Emit */
const emit = defineEmits<IEmits>()

/** Constants */
const HOUR_MS = 60 * 60_000

/** Data */
const dialogRef = ref<IDialogDisplay | null>(null)
const mode = ref<PublishMode>('now')
const publishAtInput = ref<Date | null>(null)
const errorMessage = ref<string | null>(null)
const modeOptions = [
  { id: 'now', label: 'Publish now' },
  { id: 'schedule', label: 'Schedule' }
]
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

/** Composables */
const { formatDateTime } = useAdminDateFormat()

/** Computed */
const title = computed(() => {
  const name = props.postTitle || 'this post'
  if (props.isApproval)
    return `Approve ${name}?`
  return mode.value === 'schedule' ? `Schedule ${name}` : `Publish ${name}?`
})
const message = computed(() => mode.value === 'schedule'
  ? 'It stays hidden until the hour you pick, then the saved draft goes live.'
  : 'The saved draft goes live on the blog right away.')
const confirmLabel = computed(() => mode.value === 'schedule' ? 'Schedule' : (props.isApproval ? 'Approve & publish' : 'Publish now'))
const publishAtMs = computed(() => (publishAtInput.value ? ceilToHour(publishAtInput.value.getTime()) : Number.NaN))
const minPublishDate = computed(() => new Date(new Date().setHours(0, 0, 0, 0)))
const preview = computed(() => Number.isFinite(publishAtMs.value) ? `Goes live ${formatDateTime(publishAtMs.value)} (${timeZone})` : `Times are in ${timeZone}`)

/** Watch */
watch([mode, publishAtInput], () => {
  errorMessage.value = null
})

/** Methods */
function ceilToHour(ms: number): number {
  return Math.ceil(ms / HOUR_MS) * HOUR_MS
}
function defaultPublishAt(): number {
  return ceilToHour(Date.now() + HOUR_MS)
}
function selectMode(value: string): void {
  if (value === 'now' || value === 'schedule')
    mode.value = value
}
function confirm(): void {
  if (mode.value === 'now') {
    emit('confirm', null)
    return
  }
  if (!Number.isFinite(publishAtMs.value) || publishAtMs.value < Date.now() + 60_000) {
    errorMessage.value = 'Pick a time at least a minute from now'
    return
  }
  emit('confirm', publishAtMs.value)
}
function showDialog(initialMode: PublishMode = 'now', publishAt: number | null = null): void {
  mode.value = props.canSchedule ? initialMode : 'now'
  publishAtInput.value = new Date(publishAt && publishAt > Date.now() ? ceilToHour(publishAt) : defaultPublishAt())
  errorMessage.value = null
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
    variant="primary"
    :title="title"
    :message="message"
    :confirm-label="confirmLabel"
    :loading-label="mode === 'schedule' ? 'Scheduling...' : 'Publishing...'"
    cancel-label="Cancel"
    :is-loading="props.isLoading"
    @confirm="confirm"
  >
    <template #messages>
      <div class="d-grid gap-3 text-start mt-2">
        <UiTabs
          v-if="props.canSchedule"
          :tabs="modeOptions"
          :active-tab="mode"
          fluid
          pill-tabs
          @update:active-tab="selectMode"
        />
        <p
          v-else
          class="fs-3xs text-muted mb-0"
        >
          This post is live, so its changes publish right away
        </p>
        <p
          v-if="props.canSchedule && mode === 'now'"
          class="text-muted mb-0"
        >
          The saved draft goes live on the blog as soon as you confirm, with no schedule to wait for.
        </p>
        <div
          v-if="mode === 'schedule'"
          class="d-grid gap-2"
        >
          <UiInputDate
            id="publish-at"
            v-model="publishAtInput"
            label="Publish at"
            time
            :minute-step="60"
            :min="minPublishDate"
            size="sm"
            class="mb-0"
            :error-messages="errorMessage ? [errorMessage] : []"
          />
          <p class="fs-3xs text-muted mb-0">
            {{ preview }}
          </p>
        </div>
      </div>
    </template>
  </UiConfirmModal>
</template>
