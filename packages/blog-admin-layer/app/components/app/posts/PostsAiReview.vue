<script setup lang="ts">
import type { IPostAiReviewSelection } from '#admin/app/composables/usePostAi'
import type { IPostEditorForm } from '#admin/app/composables/usePostEditor'

/** Props */
const props = defineProps<{
  form: IPostEditorForm
}>()

/** Composables */
const { review, loadingState, applyReview, dismissReview } = usePostAi()

/** Data */
const selection = ref<IPostAiReviewSelection>({ title: true, excerpt: true, tags: true })

/** Computed */
const newTags = computed(() => (review.value?.tags || []).filter(tag => !props.form.tags.includes(tag)))
const tagChips = computed(() => (review.value?.tags || []).map(tag => ({ id: tag, text: tag })))
const hasSelection = computed(() => !!review.value && (
  (selection.value.title && !!review.value.title)
  || (selection.value.excerpt && !!review.value.excerpt)
  || (selection.value.tags && newTags.value.length > 0)
))

/** Watch */
watch(review, () => {
  selection.value = { title: true, excerpt: true, tags: true }
})
</script>

<template>
  <UiCard
    v-if="review || loadingState.smartFill"
    variant="pane"
  >
    <template #header>
      <div class="d-flex justify-content-between align-items-center mb-0">
        <div class="d-flex align-items-center gap-2">
          <UiIconMaterial
            icon-code="&#xf4f6;"
            class="fs-base text-accent"
          />
          <p class="subtitle-2 fw-800 mb-0">
            Smart fill
          </p>
        </div>
        <UiButtonTooltip
          v-if="review"
          id="smart-fill-dismiss"
          variant="text"
          size="sm"
          icon
          tooltip-text="Discard smart fill"
          @click="dismissReview"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe5cd;" />
          </template>
        </UiButtonTooltip>
      </div>
    </template>
    <template #body>
      <!-- Loading -->
      <div
        v-if="loadingState.smartFill"
        class="d-grid gap-3"
        role="status"
        aria-label="Smart fill is being generated"
      >
        <div class="skeleton skeleton-ai-generation col-8" />
        <div class="skeleton skeleton-ai-generation col-12" />
        <div class="skeleton skeleton-ai-generation col-12" />
        <div class="skeleton skeleton-ai-generation col-6" />
      </div>

      <!-- Review -->
      <div
        v-else-if="review"
        class="d-grid gap-3"
      >
        <div
          v-if="review.title"
          class="ai-panel d-grid gap-2 p-2"
        >
          <UiInputCheck
            id="smart-fill-title"
            v-model="selection.title"
            size="sm"
            label="Title"
            class="mb-0"
          />
          <p class="subtitle-2 lh-md mb-0">
            {{ review.title }}
          </p>
          <p
            v-if="props.form.title?.trim()"
            class="caption fw-400 text-muted mb-0"
          >
            Replaces: {{ props.form.title }}
          </p>
        </div>

        <div
          v-if="review.excerpt"
          class="ai-panel d-grid gap-2 p-2"
        >
          <UiInputCheck
            id="smart-fill-excerpt"
            v-model="selection.excerpt"
            size="sm"
            label="Excerpt"
            class="mb-0"
          />
          <p class="subtitle-2 lh-md mb-0">
            {{ review.excerpt }}
          </p>
          <p
            v-if="props.form.shortText?.trim()"
            class="caption fw-400 text-muted mb-0"
          >
            Replaces the current excerpt
          </p>
        </div>

        <div
          v-if="review.tags.length"
          class="ai-panel d-grid gap-2 p-2"
        >
          <UiInputCheck
            id="smart-fill-tags"
            v-model="selection.tags"
            size="sm"
            label="Tags"
            class="mb-0"
          />
          <UiChipGroup
            :options="tagChips"
            variant="outline"
            color="secondary"
            aria-label="Proposed tags"
          />
          <p class="caption fw-400 text-muted mb-0">
            {{ newTags.length ? `Adds ${newTags.join(', ')} to the selected tags` : 'Already selected' }}
          </p>
        </div>

        <UiButtonGroup connected>
          <UiButton
            variant="filled"
            size="sm"
            text="Apply selected"
            :disabled="!hasSelection"
            @click="applyReview(selection)"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe5ca;" />
            </template>
          </UiButton>
          <UiButton
            variant="text"
            size="sm"
            text="Discard"
            @click="dismissReview"
          />
        </UiButtonGroup>
      </div>
    </template>
  </UiCard>
</template>
