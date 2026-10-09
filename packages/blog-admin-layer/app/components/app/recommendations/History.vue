<script setup lang="ts">
import type { IRecommendationRun } from '#admin/shared/models/recommendation'

/** Interfaces */
interface IProps {
  runs: IRecommendationRun[]
  activeRunId: string | null
  isLoading: boolean
}
interface IEmits {
  pick: [id: string]
  remove: [run: IRecommendationRun]
  newChat: []
}

/** Props */
defineProps<IProps>()

/** Emit */
const emit = defineEmits<IEmits>()

/** Methods */
function runLabel(run: IRecommendationRun): string {
  return run.prompt.trim() || (run.kind === 'analysis' ? 'Coverage analysis' : 'Recommendations')
}
</script>

<template>
  <UiCard
    variant="pane"
    class="recommendations-rail"
  >
    <template #header>
      <div class="d-flex align-items-center justify-content-between gap-2">
        <h2 class="fs-base fw-500 mb-0">
          Chats
        </h2>
        <UiButtonTooltip
          id="recommendations-rail-new-chat"
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
      </div>
    </template>
    <template #body>
      <div
        v-if="isLoading"
        class="d-grid gap-2 p-2"
        role="status"
        aria-label="Loading saved chats"
      >
        <UiBaseSkeleton width="100%" height="2.25rem" />
        <UiBaseSkeleton width="100%" height="2.25rem" />
        <UiBaseSkeleton width="80%" height="2.25rem" />
      </div>
      <UiEmpty
        v-else-if="!runs.length"
        title="No saved chats"
        subtitle="The first chat you start is saved here."
        use-custom-icon
        icon-code="&#xe889;"
      />
      <ul
        v-else
        class="recommendations-rail-list"
        aria-label="Saved chats"
      >
        <li
          v-for="run in runs"
          :key="run.id"
          class="recommendations-rail-row"
          :class="{ 'is-active': run.id === activeRunId }"
        >
          <button
            type="button"
            class="recommendations-rail-link"
            :aria-current="run.id === activeRunId ? 'true' : undefined"
            :title="runLabel(run)"
            @click="run.id && emit('pick', run.id)"
          >
            <span class="recommendations-rail-label">{{ runLabel(run) }}</span>
          </button>
          <UiButtonMenu
            :id="`chat-menu-${run.id}`"
            variant="text"
            size="sm"
            icon
            class="recommendations-rail-menu text-neutral"
            tooltip-text="Chat options"
            aria-label="Chat options"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe5d4;" />
            </template>
            <template #menu>
              <UiButtonMenuItem
                item-text="Delete chat"
                icon="&#xe872;"
                is-destructive
                @click="emit('remove', run)"
              />
            </template>
          </UiButtonMenu>
        </li>
      </ul>
    </template>
  </UiCard>
</template>
