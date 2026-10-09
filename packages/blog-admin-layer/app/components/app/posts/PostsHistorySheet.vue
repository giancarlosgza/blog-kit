<script setup lang="ts">
import type { IDialogDisplay, ITimelineItem } from '@colorffy/ui'
import type { IPostEvent, PostEventType } from '#admin/shared/models/post'
import { POST_EVENT_LABELS, POST_STATUS_LABELS } from '#admin/shared/utils/post-status'

/** Interfaces */
interface IProps {
  postTitle?: string | null
  events?: IPostEvent[]
  isLoading?: boolean
  errorMessage?: string | null
  currentUid?: string | null
}
interface IHistoryItem extends ITimelineItem {
  event: IPostEvent
  actorName: string
  label: string
}
interface IHistoryDay {
  key: string
  label: string
  items: IHistoryItem[]
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  postTitle: null,
  events: () => [],
  isLoading: false,
  errorMessage: null,
  currentUid: null
})

/** Data */
const dialogRef = ref<IDialogDisplay | null>(null)
const eventIcons: Record<PostEventType, string> = {
  created: '&#xe150;',
  submitted: '&#xe163;',
  resubmitted: '&#xe163;',
  withdrawn: '&#xe166;',
  changes_requested: '&#xe0b9;',
  resolved: '&#xe5ca;',
  approved: '&#xe86c;',
  scheduled: '&#xe8b5;',
  published: '&#xe2c6;',
  unpublished: '&#xf236;'
}

/** Composables */
const { toDate } = useDateFormat()

/** Computed */
const days = computed<IHistoryDay[]>(() => {
  const groups = new Map<string, IHistoryDay>()
  for (const event of props.events) {
    const date = toDate(event.at)
    const key = date ? date.toDateString() : 'unknown'
    if (!groups.has(key))
      groups.set(key, { key, label: dayLabel(date), items: [] })
    groups.get(key)!.items.push({
      id: event.id ?? `${event.type}-${key}-${groups.get(key)!.items.length}`,
      icon: eventIcons[event.type] ?? '&#xe889;',
      time: date ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
      event,
      actorName: event.actor?.uid && event.actor.uid === props.currentUid ? 'You' : event.actor?.name || 'Someone',
      label: eventLabel(event)
    })
  }
  return [...groups.values()]
})

/** Methods */
function dayLabel(date: Date | null): string {
  if (!date)
    return 'Earlier'
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString())
    return 'Today'
  if (date.toDateString() === yesterday.toDateString())
    return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }) })
}
function eventLabel(event: IPostEvent): string {
  if (event.type === 'approved')
    return event.to === 'scheduled' ? 'approved and scheduled the post' : 'approved and published the post'
  if (event.type === 'unpublished' && event.from === 'scheduled')
    return 'cancelled the schedule'
  if (event.type === 'created' && !event.actor?.uid)
    return 'created the post'
  return POST_EVENT_LABELS[event.type] ?? event.type
}
function entry(item: ITimelineItem): IHistoryItem {
  return item as IHistoryItem
}
function hasTransition(event: IPostEvent): boolean {
  return !!event.from && !!event.to && event.from !== event.to && event.type !== 'created'
}
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
  <UiModal
    ref="dialogRef"
    mode="side-sheet"
    body-dialog-class="scroll-fade-block-effect"
    class="dialog-backdrop-blur workflow-sheet"
    aria-labelledby="post-history-title"
    aria-describedby="post-history-description"
  >
    <template #header>
      <div class="workflow-sheet-heading">
        <h2
          id="post-history-title"
          class="dialog-title fs-base fw-800 mb-0"
        >
          History
        </h2>
        <p
          id="post-history-description"
          class="fs-3xs text-muted text-truncate mb-0"
          :title="props.postTitle ?? undefined"
        >
          {{ props.postTitle || 'Workflow history' }}
        </p>
      </div>
      <UiButton
        variant="outline"
        title="Close history"
        aria-label="Close history"
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
      <UiAlert
        v-if="props.errorMessage"
        :message="props.errorMessage"
        type="tonal"
        variant="danger"
        size="sm"
        class="mb-3"
      />
      <div
        v-if="props.isLoading"
        class="d-grid gap-3"
        role="status"
        aria-label="Loading history"
      >
        <div class="skeleton skeleton-lg" />
        <div class="skeleton skeleton-lg" />
        <div class="skeleton skeleton-lg" />
      </div>
      <UiEmpty
        v-else-if="!days.length && !props.errorMessage"
        title="No history yet"
        subtitle="Submits, reviews and publishes show up here"
        use-custom-icon
        icon-code="&#xe889;"
      />
      <template v-else>
        <section
          v-for="day in days"
          :key="day.key"
          class="history-day"
          :aria-label="day.label"
        >
          <p class="caption text-muted mb-2">
            {{ day.label }}
          </p>
          <UiTimeline
            :items="day.items"
            size="sm"
          >
            <template #item="{ item }">
              <div class="d-grid gap-2">
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <p class="fs-3xs mb-0">
                    <strong>{{ entry(item).actorName }}</strong> {{ entry(item).label }}
                  </p>
                  <time class="font-code fs-4xs text-muted text-nowrap">{{ item.time }}</time>
                </div>
                <div
                  v-if="entry(item).event.from && entry(item).event.to && hasTransition(entry(item).event)"
                  class="history-transition"
                  :aria-label="`From ${POST_STATUS_LABELS[entry(item).event.from!]} to ${POST_STATUS_LABELS[entry(item).event.to!]}`"
                >
                  <AppPostsStatusBadge :status="entry(item).event.from!" />
                  <UiIconMaterial
                    icon-code="&#xe5c8;"
                    class="fs-sm text-muted"
                    aria-hidden="true"
                  />
                  <AppPostsStatusBadge :status="entry(item).event.to!" />
                </div>
                <UiBadgeGroup
                  v-if="entry(item).event.reasons?.length"
                  class="gap-1"
                >
                  <UiBadge
                    v-for="reason in entry(item).event.reasons"
                    :key="reason"
                    variant="outline"
                    size="sm"
                    :text="reason"
                  />
                </UiBadgeGroup>
                <div
                  v-if="entry(item).event.note"
                  class="workflow-note"
                >
                  <p>{{ entry(item).event.note }}</p>
                </div>
              </div>
            </template>
          </UiTimeline>
        </section>
      </template>
    </template>
    <template #footer>
      <UiButton
        variant="outline"
        text="Close"
        @click="closeDialog"
      />
    </template>
  </UiModal>
</template>
