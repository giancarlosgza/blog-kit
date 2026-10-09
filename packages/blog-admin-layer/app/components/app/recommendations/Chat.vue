<script setup lang="ts">
import type { IRecommendationChip } from '#admin/app/composables/useRecommendationsAi'
import type { ISafetyRating } from '#admin/shared/models/gemini'
import type { IRecommendationItem, IRecommendationPin, IRecommendationRun, RecommendationKind } from '#admin/shared/models/recommendation'

/** Interfaces */
interface IProps {
  activeRun: IRecommendationRun | null
  isLoadingRuns: boolean
  isRunning: boolean
  isHistoryOpen: boolean
  pendingPrompt: string
  chips: IRecommendationChip[]
  placeholder: string
  pinnedIds: string[]
  errorMessage: string | null
  safetyRatings: ISafetyRating[] | null
}
interface IEmits {
  toggleHistory: []
  newChat: []
  togglePin: [pin: IRecommendationPin]
  submit: [text: string, kind: RecommendationKind]
}

/** Props */
const props = defineProps<IProps>()

/** Emit */
const emit = defineEmits<IEmits>()

/** Models */
const draft = defineModel<string>('draft', { default: '' })

/** Composables */
const { models } = useGeminiAi()
const selectedModel = useGeminiModel()
const { formatDate } = useAdminDateFormat()

/** Computed */
const runTitle = computed(() => {
  if (!props.activeRun)
    return 'New chat'
  const text = props.activeRun.prompt.trim()
  return text.length > 90 ? `${text.slice(0, 90)}…` : text
})
const runCaption = computed(() => {
  if (!props.activeRun)
    return 'Ask Gemini and the answer is saved for next time'
  return `${formatDate(props.activeRun.createdAt)} · ${props.activeRun.model}`
})
const items = computed<IRecommendationItem[]>(() => props.activeRun?.response.items ?? [])

/** Methods */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
function pinId(item: IRecommendationItem): string {
  return `item:${item.name}`
}
function isPinned(item: IRecommendationItem): boolean {
  return props.pinnedIds.includes(pinId(item))
}
function onTogglePin(item: IRecommendationItem): void {
  emit('togglePin', { id: pinId(item), label: item.name, meta: `${capitalize(item.kind)} · ${item.when}`, source: 'item' })
}
function onSubmit(): void {
  if (props.isRunning)
    return
  emit('submit', draft.value.trim() || props.chips[0]?.prompt || '', 'recommendations')
}
function onPickChip(chip: IRecommendationChip): void {
  draft.value = draft.value === chip.prompt ? '' : chip.prompt
}
</script>

<template>
  <UiCard
    variant="pane"
    class="recommendations-chat"
  >
    <template #header>
      <div class="recommendations-chat-header">
        <div class="recommendations-chat-title">
          <span class="icon-wrap icon-wrap-sm bg-accent-fixed bg-opacity-20 text-accent rounded-md">
            <UiIconMaterial icon-code="&#xe65f;" />
          </span>
          <div class="recommendations-chat-title-text">
            <p class="fs-sm fw-500 mb-0 text-truncate">
              {{ runTitle }}
            </p>
            <p class="caption text-muted mb-0 text-truncate">
              {{ runCaption }}
            </p>
          </div>
        </div>
        <UiButtonGroup class="gap-1">
          <UiButtonTooltip
            id="recommendations-history"
            :variant="isHistoryOpen ? 'tonal' : 'text'"
            :color="isHistoryOpen ? 'secondary' : undefined"
            size="sm"
            icon
            class="recommendations-history-toggle"
            :class="{ 'text-neutral': !isHistoryOpen }"
            tooltip-text="Saved chats"
            aria-label="Toggle saved chats"
            :aria-expanded="isHistoryOpen"
            @click="emit('toggleHistory')"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe889;" />
            </template>
          </UiButtonTooltip>
          <UiButtonTooltip
            id="recommendations-new-chat"
            variant="text"
            size="sm"
            icon
            class="text-neutral"
            tooltip-text="New chat"
            aria-label="Start a new chat"
            @click="emit('newChat')"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe145;" />
            </template>
          </UiButtonTooltip>
        </UiButtonGroup>
      </div>
    </template>

    <template #body>
      <div class="recommendations-thread">
        <template v-if="activeRun">
          <p class="recommendation-turn">
            {{ activeRun.prompt }}
          </p>
          <p class="fs-sm text-muted lh-md mb-0">
            {{ activeRun.response.summary }}
          </p>
          <UiListGroup
            v-if="items.length"
            variant="flush"
            size="sm"
            is-undecorated
          >
            <UiListItem
              v-for="item in items"
              :key="item.name"
              :title="item.name"
              :text="`${capitalize(item.kind)} · ${item.when}`"
              has-actions
            >
              <template #media>
                <span
                  v-if="item.colors.length"
                  class="recommendation-swatches"
                  aria-hidden="true"
                >
                  <span
                    v-for="color in item.colors"
                    :key="color"
                    :style="{ '--_swatch-color': color }"
                  />
                </span>
                <span
                  v-else
                  class="icon-wrap icon-wrap-sm bg-secondary-fixed bg-opacity-20 text-secondary rounded-md font-code fs-3xs"
                >{{ item.kind.slice(0, 2).toUpperCase() }}</span>
              </template>
              <template #list-action>
                <UiButtonTooltip
                  :id="`pin-${item.name}`"
                  :variant="isPinned(item) ? 'tonal' : 'text'"
                  :color="isPinned(item) ? 'secondary' : undefined"
                  size="sm"
                  icon
                  :class="{ 'text-neutral': !isPinned(item) }"
                  :tooltip-text="isPinned(item) ? 'Unpin' : 'Pin to plan'"
                  :aria-label="isPinned(item) ? `Unpin ${item.name}` : `Pin ${item.name} to the plan`"
                  :aria-pressed="isPinned(item)"
                  @click="onTogglePin(item)"
                >
                  <template #icon>
                    <UiIconMaterial icon-code="&#xe6aa;" />
                  </template>
                </UiButtonTooltip>
              </template>
            </UiListItem>
          </UiListGroup>
          <p
            v-else-if="activeRun.kind === 'analysis'"
            class="caption text-muted mb-0"
          >
            This chat is an analysis. Its verdicts are in the Coverage tab.
          </p>
        </template>

        <UiEmpty
          v-else-if="!isLoadingRuns && !isRunning"
          title="Ask what to publish next"
          subtitle="Gemini answers with dated ideas and every chat is saved, so you never pay for the same question twice."
          use-custom-icon
          icon-code="&#xe65f;"
        />

        <!-- Pending run -->
        <div
          v-if="isRunning"
          class="d-grid gap-2"
          role="status"
          aria-label="Gemini is generating"
        >
          <p class="recommendation-turn">
            {{ pendingPrompt }}
          </p>
          <UiBaseSkeleton width="70%" />
          <UiBaseSkeleton width="90%" />
          <UiBaseSkeleton width="55%" />
        </div>

        <AppAiErrorAlert
          :message="errorMessage"
          :safety-ratings="safetyRatings"
        />
      </div>
    </template>

    <template #footer>
      <div class="recommendations-composer">
        <div class="recommendations-chips inline-scroll">
          <UiChip
            v-for="chip in chips"
            :key="chip.label"
            :text="chip.label"
            color="secondary"
            :selected="draft === chip.prompt"
            @click="onPickChip(chip)"
          />
        </div>
        <div
          class="recommendations-prompt"
          :class="{ 'is-running': isRunning }"
        >
          <UiInputTextarea
            id="recommendations-prompt"
            v-model="draft"
            label="Ask Gemini"
            hide-label
            variant="transparent"
            form-class="form-transparent"
            :placeholder="placeholder"
            :rows="1"
            :maxlength="600"
            resize="none"
            class="mb-0"
            @keydown.enter.exact.prevent="onSubmit"
          />
          <div class="recommendations-prompt-bar">
            <UiButtonMenu
              id="recommendations-model"
              variant="text"
              custom-class="text-neutral"
              size="sm"
              rounded
              icon-trailing
              :text="selectedModel"
              tooltip-text="Select a Gemini model"
              aria-label="Select a Gemini model"
              :disabled="isRunning"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5cf;" />
              </template>
              <template #menu>
                <template
                  v-for="(group, groupIndex) in models"
                  :key="`group-${groupIndex}`"
                >
                  <UiButtonMenuText :item-text="group.name" />
                  <UiButtonMenuItem
                    v-for="model in group.models"
                    :key="model.name"
                    :item-text="model.description"
                    icon="&#xf5f5;"
                    :custom-class="selectedModel === model.name ? 'active' : ''"
                    @click="selectedModel = model.name as typeof selectedModel"
                  />
                  <UiButtonMenuDivider v-if="groupIndex < models.length - 1" />
                </template>
              </template>
            </UiButtonMenu>
            <UiButtonTooltip
              id="recommendations-run"
              variant="filled"
              color="accent"
              icon
              :loading="isRunning"
              :disabled="isRunning"
              tooltip-text="Run"
              aria-label="Run the recommendations"
              @click="onSubmit"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5d8;" />
              </template>
            </UiButtonTooltip>
          </div>
        </div>
      </div>
    </template>
  </UiCard>
</template>
