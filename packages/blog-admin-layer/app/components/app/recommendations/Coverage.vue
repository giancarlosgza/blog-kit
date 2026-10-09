<script setup lang="ts">
import type { IRecommendationCoverage, IRecommendationVerdict } from '#admin/shared/models/recommendation'

/** Interfaces */
interface IProps {
  coverage: IRecommendationCoverage[]
  verdicts: IRecommendationVerdict[]
  sourceLabel: string
  unitLabel: string
  analysisDate: string | null
  isLoadingCoverage: boolean
  isRunning: boolean
  coverageError: string | null
}
interface IEmits {
  rerun: []
}

/** Props */
const props = defineProps<IProps>()

/** Emit */
const emit = defineEmits<IEmits>()

/** Constants */
const MAX_ROWS = 14

/** Computed */
const rows = computed(() => {
  const max = Math.max(1, ...props.coverage.map(row => row.count))
  return props.coverage.slice(0, MAX_ROWS).map(row => ({
    ...row,
    width: `${Math.max(2, Math.round(row.count / max * 100))}%`
  }))
})

/** Methods */
function verdictVariant(verdict: IRecommendationVerdict): string {
  if (verdict.tag === 'Gap')
    return 'tonal tonal-warning'
  if (verdict.tag === 'New')
    return 'tonal tonal-success'
  return 'tonal tonal-secondary'
}
</script>

<template>
  <div class="trend-coverage">
    <UiCard variant="pane">
      <template #header>
        <div class="d-flex align-items-center justify-content-between gap-2">
          <div>
            <h3 class="fs-base fw-500 mb-0">
              Coverage by {{ unitLabel }}
            </h3>
            <p class="caption text-muted mb-0">
              Counts read from {{ sourceLabel }}. Purple is trending now, amber is a seasonal gap.
            </p>
          </div>
          <UiButtonTooltip
            id="recommendations-rerun-analysis"
            variant="text"
            custom-class="text-accent"
            size="sm"
            icon
            tooltip-text="Re-run analysis"
            aria-label="Re-run the coverage analysis"
            :loading="isRunning"
            :disabled="isRunning"
            @click="emit('rerun')"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe65f;" />
            </template>
          </UiButtonTooltip>
        </div>
      </template>
      <template #body>
        <UiAlert
          v-if="coverageError"
          type="tonal"
          variant="danger"
          size="sm"
          :message="coverageError"
          class="mb-2"
        />
        <div
          v-if="isLoadingCoverage"
          class="d-grid gap-2"
          role="status"
          aria-label="Loading tag counts"
        >
          <UiBaseSkeleton width="100%" />
          <UiBaseSkeleton width="80%" />
          <UiBaseSkeleton width="60%" />
        </div>
        <UiEmpty
          v-else-if="!rows.length"
          title="No counts yet"
          :subtitle="`Nothing was read from ${sourceLabel}.`"
          use-custom-icon
          icon-code="&#xe26b;"
        />
        <ul
          v-else
          class="coverage-rows"
        >
          <li
            v-for="row in rows"
            :key="row.label"
            class="coverage-row"
            :class="`is-${row.state}`"
          >
            <span class="fs-xs text-truncate">{{ row.label }}</span>
            <span
              class="coverage-track"
              role="meter"
              :aria-valuenow="row.count"
              :aria-label="`${row.label}, ${row.count} items`"
            >
              <span
                class="coverage-fill"
                :style="{ inlineSize: row.width }"
              />
            </span>
            <span class="caption font-code text-muted text-end">{{ row.count }}</span>
          </li>
        </ul>
      </template>
    </UiCard>

    <UiCard
      variant="pane"
      class="border border-accent bg-accent-fixed bg-opacity-10"
    >
      <template #header>
        <div class="d-flex align-items-center justify-content-between gap-2">
          <h3 class="fs-base fw-500 mb-0">
            Make more of this
          </h3>
          <span
            v-if="analysisDate"
            class="caption text-muted"
          >{{ analysisDate }}</span>
        </div>
      </template>
      <template #body>
        <UiEmpty
          v-if="!verdicts.length"
          title="No verdicts yet"
          subtitle="Run the analysis and Gemini tells you which content to make more of."
          use-custom-icon
          icon-code="&#xe65f;"
        />
        <div
          v-else
          class="d-flex flex-column gap-3"
          role="list"
        >
          <div
            v-for="(verdict, index) in verdicts"
            :key="index"
            class="d-flex flex-column align-items-start gap-2"
            role="listitem"
          >
            <UiBadge
              :text="verdict.tag"
              :variant="verdictVariant(verdict)"
              size="sm"
              class="flex-shrink-0 mt-1"
            />
            <p class="subtitle-2 lh-md mb-0">
              {{ verdict.text }}
            </p>
          </div>
        </div>
      </template>
    </UiCard>
  </div>
</template>
