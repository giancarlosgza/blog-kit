<script setup lang="ts">
import type { IDialogDisplay, UiAlertToast } from '@colorffy/ui'
import type { IRecommendationPin, IRecommendationPlanAction, IRecommendationRun, RecommendationKind } from '#admin/shared/models/recommendation'
import { useToast } from '@colorffy/ui'
import { RECOMMENDATIONS_SOURCE_LABEL, RECOMMENDATIONS_UNIT_LABEL } from '#admin/app/composables/useRecommendationsAi'

/** Head */
const chips = useAppConfig().admin.ai.chips
const route = useRoute()
const siteUrl = useAdminSiteUrl()

definePageMeta({
  pageTitle: 'AI Recommendations',
  middleware: ['auth']
})
useSeoMeta({
  title: 'AI Recommendations',
  description: 'Post ideas from Gemini, grounded in the blog tags and saved per chat.',
  ogTitle: 'AI Recommendations',
  ogDescription: 'Post ideas from Gemini, grounded in the blog tags and saved per chat.',
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'AI Recommendations',
  twitterDescription: 'Post ideas from Gemini, grounded in the blog tags and saved per chat.',
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

/** Constants */
const DESK_TABS = [
  { id: 'topics', label: 'Topics', icon: '&#xebcc;' },
  { id: 'coverage', label: 'Coverage', icon: '&#xe26b;' },
  { id: 'plan', label: 'Plan', icon: '&#xe6aa;' }
]

/** Data */
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const confirmDeleteDialog = ref<IDialogDisplay | null>(null)
const runToDelete = ref<IRecommendationRun | null>(null)
const isDeleting = ref<boolean>(false)
const activeRunId = ref<string | null>(null)
const deskTab = ref<string>('topics')
const draft = ref<string>('')
const pendingPrompt = ref<string>('')
const historyOpen = ref<boolean>(false)

/** Composables */
const { onToastMessage } = useToast(toast)
const { formatDate } = useAdminDateFormat()
const { runs, isLoading: isLoadingRuns, error: runsError, fetchRuns, prependRun, savePins, removeRun } = useRecommendationRuns()
const { coverage, isLoadingCoverage, coverageError, loadCoverage, createRun, isLoading: isRunning, error, errorSafetyRating, resetErrors } = useRecommendationsAi()

/** Computed */
const activeRun = computed<IRecommendationRun | null>(() => runs.value.find(run => run.id === activeRunId.value) ?? null)
const latestAnalysis = computed<IRecommendationRun | null>(() => runs.value.find(run => run.kind === 'analysis') ?? null)
// Active run, or the newest run with boards
const monthsSource = computed<IRecommendationRun | null>(() => {
  if (activeRun.value?.response.months.length)
    return activeRun.value
  return runs.value.find(run => run.response.months.length) ?? null
})
const verdictsSource = computed<IRecommendationRun | null>(() => {
  if (activeRun.value?.response.verdicts.length)
    return activeRun.value
  return latestAnalysis.value ?? runs.value.find(run => run.response.verdicts.length) ?? null
})
const months = computed(() => monthsSource.value?.response.months ?? [])
const verdicts = computed(() => verdictsSource.value?.response.verdicts ?? [])
const analysisDate = computed(() => verdictsSource.value ? `From the ${formatDate(verdictsSource.value.createdAt)} chat` : null)
const coverageWithState = computed(() => {
  const source = verdictsSource.value?.response
  const gaps = new Set(source?.gapTags ?? [])
  const trends = new Set(source?.trendTags ?? [])
  return coverage.value.map(row => ({
    ...row,
    state: gaps.has(row.label) ? 'gap' as const : (trends.has(row.label) ? 'trend' as const : 'ok' as const)
  }))
})
const runToDeleteLabel = computed(() => {
  const text = runToDelete.value?.prompt.trim() ?? ''
  return text.length > 60 ? `${text.slice(0, 60)}…` : text || 'this chat'
})
const pins = computed<IRecommendationPin[]>(() => activeRun.value?.pinned ?? [])
const planActions: IRecommendationPlanAction[] = [
  { id: 'post', label: 'Generate post', icon: '&#xef42;' }
]
const pinnedIds = computed(() => pins.value.map(pin => pin.id))
const deskTabs = computed(() => DESK_TABS.map(tab => tab.id === 'plan' && pins.value.length
  ? { ...tab, badge: { text: String(pins.value.length), variant: 'tonal tonal-secondary', size: 'sm' } }
  : tab))

/** Lifecycle */
onMounted(async () => {
  await Promise.all([fetchRuns(), loadCoverage()])
  activeRunId.value = runs.value[0]?.id ?? null
})

/** Methods */
async function onSubmit(text: string, kind: RecommendationKind): Promise<void> {
  if (isRunning.value)
    return
  pendingPrompt.value = text || (kind === 'analysis' ? `Analyze ${RECOMMENDATIONS_SOURCE_LABEL} for the next three months` : chips[0]?.prompt || '')
  const run = await createRun(kind, text)
  if (!run)
    return
  prependRun(run)
  activeRunId.value = run.id ?? null
  draft.value = ''
  if (kind === 'analysis')
    deskTab.value = 'coverage'
}
function onRerunAnalysis(): void {
  onSubmit(draft.value, 'analysis')
}
function onPickRun(id: string): void {
  activeRunId.value = id
  historyOpen.value = false
  resetErrors()
  const run = runs.value.find(item => item.id === id)
  if (run?.kind === 'analysis')
    deskTab.value = 'coverage'
}
function onNewChat(): void {
  draft.value = ''
  historyOpen.value = false
  resetErrors()
}
function onRemoveRun(run: IRecommendationRun): void {
  runToDelete.value = run
  confirmDeleteDialog.value?.showDialog()
}
async function confirmDelete(): Promise<void> {
  const run = runToDelete.value
  if (!run)
    return
  isDeleting.value = true
  try {
    await removeRun(run)
    if (activeRunId.value === run.id)
      activeRunId.value = runs.value[0]?.id ?? null
    onToastMessage('success', 'Chat deleted.')
  } catch (err: any) {
    onToastMessage('danger', `Could not delete the chat: ${err.message || err}`)
  } finally {
    isDeleting.value = false
    runToDelete.value = null
    confirmDeleteDialog.value?.closeDialog()
  }
}
async function onTogglePin(pin: IRecommendationPin): Promise<void> {
  const run = activeRun.value
  if (!run)
    return
  const exists = run.pinned.some(item => item.id === pin.id)
  const next = exists ? run.pinned.filter(item => item.id !== pin.id) : [...run.pinned, pin]
  try {
    await savePins(run, next)
  } catch (err: any) {
    onToastMessage('danger', `Could not save the pin: ${err.message || err}`)
  }
}
async function onGeneratePin(pin: IRecommendationPin): Promise<void> {
  try {
    await navigateTo({ name: 'posts-new', query: { title: pin.label } })
  } catch (err: any) {
    onToastMessage('danger', `Could not open the editor: ${err.message || err}`)
  }
}
async function onCopyPlan(): Promise<void> {
  const lines = pins.value.map(pin => `- ${pin.label} (${pin.meta})`)
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    onToastMessage('success', `${pins.value.length} pinned ${pins.value.length === 1 ? 'idea' : 'ideas'} copied.`)
  } catch {
    onToastMessage('danger', 'Could not copy the plan.')
  }
}
</script>

<template>
  <div class="container-fluid recommendations-page">
    <div class="recommendations-shell">
      <!-- Error -->
      <UiAlert
        v-if="runsError"
        type="tonal"
        variant="danger"
        size="sm"
        :message="`${runsError}`"
        class="mb-2"
      />

      <div class="recommendations-layout">
        <!-- Chats -->
        <AppRecommendationsHistory
          :class="{ 'is-open': historyOpen }"
          :runs="runs"
          :active-run-id="activeRunId"
          :is-loading="isLoadingRuns"
          @pick="onPickRun"
          @remove="onRemoveRun"
          @new-chat="onNewChat"
        />

        <!-- Chat -->
        <AppRecommendationsChat
          v-model:draft="draft"
          :active-run="activeRun"
          :is-loading-runs="isLoadingRuns"
          :is-running="isRunning"
          :is-history-open="historyOpen"
          :pending-prompt="pendingPrompt"
          :chips="chips"
          placeholder="Ask for post ideas, an angle on a trend or a gap in your tags"
          :pinned-ids="pinnedIds"
          :error-message="error"
          :safety-ratings="errorSafetyRating"
          @toggle-history="historyOpen = !historyOpen"
          @new-chat="onNewChat"
          @toggle-pin="onTogglePin"
          @submit="onSubmit"
        />

        <!-- Trend desk -->
        <section
          class="trend-desk"
          aria-label="Trend desk"
        >
          <div class="trend-desk-header">
            <UiTabs
              v-model:active-tab="deskTab"
              :tabs="deskTabs"
              pill-tabs
              fluid
              size="sm"
              aria-label="Trend desk views"
            />
          </div>

          <div class="trend-desk-body">
            <AppRecommendationsTopics
              v-if="deskTab === 'topics'"
              :months="months"
              :pinned-ids="pinnedIds"
              :can-pin="!!activeRun"
              @toggle-pin="onTogglePin"
            />
            <AppRecommendationsCoverage
              v-else-if="deskTab === 'coverage'"
              :coverage="coverageWithState"
              :verdicts="verdicts"
              :source-label="RECOMMENDATIONS_SOURCE_LABEL"
              :unit-label="RECOMMENDATIONS_UNIT_LABEL"
              :analysis-date="analysisDate"
              :is-loading-coverage="isLoadingCoverage"
              :is-running="isRunning"
              :coverage-error="coverageError"
              @rerun="onRerunAnalysis"
            />
            <AppRecommendationsPlan
              v-else
              :pins="pins"
              :has-run="!!activeRun"
              :actions="planActions"
              @remove="onTogglePin"
              @generate="onGeneratePin"
              @copy="onCopyPlan"
            />
          </div>
        </section>
      </div>
    </div>

    <UiConfirmModal
      ref="confirmDeleteDialog"
      variant="danger"
      title="Delete this chat?"
      :message="`The chat '${runToDeleteLabel}' and its pinned ideas are removed for everyone. This cannot be undone.`"
      confirm-label="Yes, delete"
      loading-label="Deleting..."
      :is-loading="isDeleting"
      @confirm="confirmDelete"
    />
    <UiAlertToast ref="toast" />
  </div>
</template>
