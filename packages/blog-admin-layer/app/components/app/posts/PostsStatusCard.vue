<script setup lang="ts">
import type { IStepItem } from '@colorffy/ui'
import type { AdminRole } from '#admin/shared/models/admin'
import type { IPost } from '#admin/shared/models/post'
import { resolvePostStatus, REVIEW_NOTE_MAX } from '#admin/shared/utils/post-status'

/** Interfaces */
interface IProps {
  post: IPost
  role?: AdminRole | null
  currentUid?: string | null
  pending?: string | null
  disabled?: boolean
}
interface IEmits {
  submit: [note: string]
  withdraw: []
  resolve: []
  publish: []
  schedule: []
  requestChanges: []
  cancelSchedule: []
  history: []
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  role: null,
  currentUid: null,
  pending: null,
  disabled: false
})

/** Emit */
const emit = defineEmits<IEmits>()

/** Data */
const reply = ref<string>('')

/** Composables */
const { formatDate, formatDateTime, formatTitleDate } = useDateFormat()

/** Computed */
const status = computed(() => resolvePostStatus(props.post))
const isAdmin = computed(() => props.role === 'admin')
const review = computed(() => props.post.review ?? null)
const isBusy = computed(() => props.disabled || !!props.pending)
const isSubmitter = computed(() => !!props.currentUid && review.value?.submittedBy?.uid === props.currentUid)
const canWithdraw = computed(() => isAdmin.value || isSubmitter.value)
const submitterName = computed(() => (isSubmitter.value ? 'you' : review.value?.submittedBy?.name || 'an editor'))
const isLiveRevision = computed(() => props.post.isPublished && (status.value === 'review' || status.value === 'changes'))
const activeStep = computed(() => ({ draft: 'draft', review: 'review', changes: 'review', scheduled: 'live', published: 'live' })[status.value])
const steps = computed<IStepItem[]>(() => [
  { id: 'draft', label: 'Draft' },
  { id: 'review', label: 'In review', description: status.value === 'changes' ? 'Changes requested' : undefined },
  { id: 'live', label: status.value === 'scheduled' ? 'Scheduled' : 'Published' }
].map(step => ({ ...step, disabled: step.id !== activeStep.value })))
const replyCount = computed(() => `Optional · ${reply.value.length} / ${REVIEW_NOTE_MAX}`)

/** Watch */
watch(status, () => {
  reply.value = ''
})
</script>

<template>
  <UiCard variant="pane">
    <template #header>
      <div class="d-flex justify-content-between align-items-center gap-2 mb-0">
        <UiSubheadingContent
          title="Status"
          as="h3"
          gutter="none"
        />
        <AppPostsStatusBadge :status="status" />
      </div>
    </template>
    <template #body>
      <div class="d-grid gap-3">
        <UiStepper
          :steps="steps"
          :active-step="activeStep"
          custom-class="workflow-stepper"
          aria-label="Workflow progress"
          class="mb-2"
        />

        <!-- Draft / Published -->
        <template v-if="status === 'draft' || status === 'published'">
          <template v-if="isAdmin">
            <UiButtonGroup
              connected
              class="flex-nowrap"
            >
              <UiButton
                variant="tonal"
                color="neutral"
                :text="status === 'published' ? 'Republish' : 'Publish'"
                class="flex-grow-1"
                fluid
                :loading="pending === 'publish'"
                :disabled="isBusy"
                @click="emit('publish')"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe2c6;" />
                </template>
              </UiButton>
              <UiButtonMenu
                id="status-publish-options"
                variant="tonal"
                color="neutral"
                icon
                tooltip-text="More publish options"
                aria-label="More publish options"
                :disabled="isBusy"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe5cf;" />
                </template>
                <template #menu>
                  <UiButtonMenuItem
                    icon="&#xe8b5;"
                    item-text="Schedule…"
                    :disabled="post.isPublished"
                    @click="emit('schedule')"
                  />
                </template>
              </UiButtonMenu>
            </UiButtonGroup>
            <p class="fs-3xs text-muted mb-0">
              {{ status === 'published' ? 'Live on the blog. Body changes go live when you publish again' : 'Publish now or pick a time. Editors’ posts wait in the review queue' }}
            </p>
          </template>
          <template v-else>
            <UiButton
              :variant="status === 'published' ? 'outline' : 'filled'"
              text="Submit for review"
              fluid
              :loading="pending === 'submit'"
              :disabled="isBusy"
              @click="emit('submit', '')"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe163;" />
              </template>
            </UiButton>
            <p class="fs-3xs text-muted mb-0">
              {{ status === 'published' ? 'Live on the blog. Saved changes stay in the draft until an admin publishes them' : 'An admin reviews the post before it goes live' }}
            </p>
          </template>
        </template>

        <!-- In review -->
        <template v-else-if="status === 'review'">
          <template v-if="isAdmin">
            <div
              v-if="review?.note"
              class="workflow-note"
            >
              <div class="workflow-note-head">
                <UiAvatar
                  :initials="getInitials(review.submittedBy?.name)"
                  size="sm"
                  color="secondary"
                  variant="tonal"
                />
                {{ review.submittedBy?.name }}
              </div>
              <p>{{ review.note }}</p>
            </div>
            <div class="d-grid gap-2">
              <UiButtonGroup
                connected
                class="flex-nowrap"
              >
                <UiButton
                  variant="tonal"
                  color="success"
                  text="Approve & publish"
                  class="flex-grow-1"
                  :loading="pending === 'publish'"
                  :disabled="isBusy"
                  @click="emit('publish')"
                >
                  <template #icon>
                    <UiIconMaterial icon-code="&#xe5ca;" />
                  </template>
                </UiButton>
                <UiButtonMenu
                  id="status-approve-options"
                  variant="tonal"
                  color="success"
                  icon
                  tooltip-text="More publish options"
                  aria-label="More publish options"
                  :disabled="isBusy"
                >
                  <template #icon>
                    <UiIconMaterial icon-code="&#xe5cf;" />
                  </template>
                  <template #menu>
                    <UiButtonMenuItem
                      icon="&#xe8b5;"
                      item-text="Approve and schedule…"
                      :disabled="post.isPublished"
                      @click="emit('schedule')"
                    />
                    <UiButtonMenuDivider />
                    <UiButtonMenuItem
                      icon="&#xe166;"
                      item-text="Withdraw from review"
                      @click="emit('withdraw')"
                    />
                  </template>
                </UiButtonMenu>
              </UiButtonGroup>
              <UiButton
                variant="outline"
                text="Request changes"
                fluid
                :disabled="isBusy"
                @click="emit('requestChanges')"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe0b9;" />
                </template>
              </UiButton>
            </div>
            <p class="fs-3xs text-muted mb-0">
              Submitted by {{ submitterName }} · round {{ review?.round ?? 1 }}
            </p>
          </template>
          <template v-else>
            <UiButton
              v-if="canWithdraw"
              variant="outline"
              text="Withdraw"
              fluid
              :loading="pending === 'withdraw'"
              :disabled="isBusy"
              @click="emit('withdraw')"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe166;" />
              </template>
            </UiButton>
            <p
              class="fs-3xs text-muted mb-0"
              :title="formatTitleDate(review?.submittedAt)"
            >
              {{ isSubmitter ? 'Waiting for review' : `Submitted by ${submitterName}, waiting for review` }} since {{ formatDate(review?.submittedAt, 'recently') }}
            </p>
          </template>
        </template>

        <!-- Changes requested -->
        <template v-else-if="status === 'changes'">
          <div class="workflow-note is-warning">
            <div class="workflow-note-head">
              <UiAvatar
                :initials="getInitials(review?.requestedBy?.name)"
                size="sm"
                color="warning"
                variant="tonal"
              />
              {{ review?.requestedBy?.name || 'Reviewer' }}
              <time :title="formatTitleDate(review?.requestedAt)">· {{ formatDate(review?.requestedAt, 'recently') }}</time>
            </div>
            <UiBadgeGroup
              v-if="review?.reasons?.length"
              class="gap-1"
            >
              <UiBadge
                v-for="reason in review.reasons"
                :key="reason"
                variant="outline"
                size="sm"
                :text="reason"
              />
            </UiBadgeGroup>
            <p>{{ review?.note || 'Changes were requested' }}</p>
            <div v-if="!isAdmin || review?.resolved">
              <UiBadge
                v-if="review?.resolved"
                variant="tonal tonal-success"
                size="sm"
                text="Resolved"
                icon-code="&#xe5ca;"
              />
              <UiButton
                v-else
                variant="outline"
                size="sm"
                text="Mark resolved"
                :loading="pending === 'resolve'"
                :disabled="isBusy"
                @click="emit('resolve')"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe5ca;" />
                </template>
              </UiButton>
            </div>
          </div>
          <template v-if="isAdmin">
            <p class="fs-3xs text-muted mb-0">
              Waiting for {{ submitterName }} to resubmit · round {{ review?.round ?? 1 }}
            </p>
          </template>
          <template v-else>
            <div class="d-grid gap-1">
              <UiInputTextarea
                id="review-reply"
                v-model="reply"
                label="Note for the reviewer"
                placeholder="Ex. Added alt text and merged the intro sections"
                :rows="2"
                :maxlength="REVIEW_NOTE_MAX"
                size="sm"
                class="mb-0"
              />
              <p class="fs-4xs text-muted text-end mb-0">
                {{ replyCount }}
              </p>
            </div>
            <UiButton
              variant="filled"
              text="Resubmit for review"
              fluid
              :loading="pending === 'submit'"
              :disabled="isBusy"
              @click="emit('submit', reply)"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe163;" />
              </template>
            </UiButton>
          </template>
        </template>

        <!-- Scheduled -->
        <template v-else-if="status === 'scheduled'">
          <p class="d-flex align-items-center gap-2 fs-3xs mb-0">
            <UiIconMaterial
              icon-code="&#xe8b5;"
              class="fs-base text-secondary"
            />
            <span>Goes live <strong>{{ formatDateTime(post.publishAt) || 'soon' }}</strong></span>
          </p>
          <UiButtonGroup
            v-if="isAdmin"
            connected
            class="flex-nowrap"
          >
            <UiButton
              variant="tonal"
              color="neutral"
              text="Publish now"
              class="flex-grow-1"
              :loading="pending === 'publish'"
              :disabled="isBusy"
              @click="emit('publish')"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe2c6;" />
              </template>
            </UiButton>
            <UiButtonMenu
              id="status-schedule-options"
              variant="tonal"
              color="neutral"
              icon
              tooltip-text="Schedule options"
              aria-label="Schedule options"
              :disabled="isBusy"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5cf;" />
              </template>
              <template #menu>
                <UiButtonMenuItem
                  icon="&#xe8b5;"
                  item-text="Reschedule…"
                  @click="emit('schedule')"
                />
                <UiButtonMenuDivider />
                <UiButtonMenuItem
                  icon="&#xe5c9;"
                  item-text="Cancel schedule"
                  is-destructive
                  @click="emit('cancelSchedule')"
                />
              </template>
            </UiButtonMenu>
          </UiButtonGroup>
          <p
            v-else
            class="fs-3xs text-muted mb-0"
          >
            An admin approved this post. Saved changes are included when it goes live
          </p>
        </template>

        <p
          v-if="isLiveRevision"
          class="fs-3xs text-muted mb-0"
        >
          The published version stays live until this revision is approved
        </p>

        <UiDivider class="my-0" />
        <UiButton
          variant="text"
          size="sm"
          text="History"
          class="justify-self-start"
          @click="emit('history')"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe889;" />
          </template>
        </UiButton>
      </div>
    </template>
  </UiCard>
</template>
