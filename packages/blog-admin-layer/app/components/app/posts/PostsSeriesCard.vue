<script setup lang="ts">
import type { IPostEditorForm } from '#admin/app/composables/usePostEditor'
import type { ISeriesPartPreview } from '#admin/app/utils/post-series'
import type { ISeries } from '#admin/shared/models/series'
import { isValidOrder, nextSeriesOrder, resolveSeriesSlug, seriesPartsPreview, toOrderValue } from '#admin/app/utils/post-series'

/** Interfaces */
interface IProps {
  slug: string
  series?: ISeries[] | null
  isPublished?: boolean
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  series: null,
  isPublished: false
})

/** Model */
const form = defineModel<IPostEditorForm>('form', { required: true })

/** Composables */
const { parts, isLoadingParts, loadParts } = usePostSeries()

/** Computed */
const seriesList = computed(() => props.series ?? [])
const resolvedSlug = computed(() => resolveSeriesSlug(form.value))
const matchedSeries = computed(() => seriesList.value.find(item => item.id === resolvedSlug.value) ?? null)
const partsSlug = computed(() => (form.value.isNewSeries && !matchedSeries.value ? '' : resolvedSlug.value))
const hasSeries = computed(() => form.value.isNewSeries || !!form.value.seriesSlug)
const seriesName = computed(() => matchedSeries.value?.name || form.value.newSeriesName.trim() || resolvedSlug.value)
const preview = computed(() => seriesPartsPreview(parts.value, {
  slug: props.slug,
  title: form.value.title,
  seriesOrder: form.value.seriesOrder,
  isPublished: props.isPublished
}))
const orderErrors = computed(() => (form.value.seriesOrder === null || isValidOrder(form.value.seriesOrder) ? [] : ['Use a whole number from 1']))
const duplicatePart = computed(() => preview.value.find(part => !part.isCurrent && part.seriesOrder !== null && part.seriesOrder === form.value.seriesOrder) ?? null)
const partLabel = computed(() => {
  const total = preview.value.length
  const count = `${total} ${total === 1 ? 'part' : 'parts'}`
  return isValidOrder(form.value.seriesOrder)
    ? `Part ${form.value.seriesOrder} of ${Math.max(total, form.value.seriesOrder)} in ${seriesName.value}`
    : `${count} in ${seriesName.value}`
})
const newSeriesHint = computed(() => {
  if (!resolvedSlug.value)
    return 'The slug is built from the name'
  if (matchedSeries.value)
    return `Matches the existing “${matchedSeries.value.name}” series, the post joins it`
  return `Created on save as /series/${resolvedSlug.value}`
})

/** Watch */
watch(partsSlug, async (seriesSlug) => {
  await loadParts(seriesSlug)
  if (seriesSlug !== partsSlug.value || !resolvedSlug.value)
    return
  const saved = parts.value.find(part => part.id === props.slug)?.seriesOrder
  form.value.seriesOrder = isValidOrder(saved) ? saved : nextSeriesOrder(parts.value, props.slug)
}, { immediate: true })

/** Methods */
function onSelectSeries(value: unknown) {
  form.value.seriesSlug = typeof value === 'string' ? value : ''
}
function onOrderInput(value: unknown) {
  form.value.seriesOrder = toOrderValue(value)
}
function startNewSeries() {
  form.value.isNewSeries = true
  form.value.seriesSlug = ''
  form.value.seriesOrder = 1
}
function cancelNewSeries() {
  form.value.isNewSeries = false
  form.value.newSeriesName = ''
  form.value.newSeriesDescription = ''
  form.value.seriesOrder = null
}
function clearSeries() {
  cancelNewSeries()
  form.value.seriesSlug = ''
}
function partNumber(part: ISeriesPartPreview): string {
  return part.seriesOrder === null ? '–' : String(part.seriesOrder)
}
</script>

<template>
  <UiCard variant="pane">
    <template #header>
      <div class="d-flex justify-content-between align-items-center mb-0">
        <UiSubheadingContent
          title="Series"
          as="h3"
          gutter="none"
        />
        <UiButton
          v-if="hasSeries"
          variant="text"
          color="danger"
          size="sm"
          text="Remove"
          @click="clearSeries"
        >
          <template #icon>
            <UiIconMaterial
              icon-code="&#xe16f;"
              class="text-danger"
            />
          </template>
        </UiButton>
      </div>
    </template>
    <template #body>
      <div class="d-grid gap-3">
        <!-- Pick -->
        <template v-if="!form.isNewSeries">
          <UiInputSelect
            id="series"
            :model-value="form.seriesSlug"
            :options="seriesList"
            option-label="name"
            option-value="id"
            label="Series"
            placeholder="Not in a series"
            size="sm"
            class="mb-0"
            @update:model-value="onSelectSeries"
          />
          <p
            v-if="form.seriesSlug && !matchedSeries"
            class="fs-3xs text-muted mb-0"
          >
            Saved series “{{ form.seriesSlug }}” isn’t in the series list
          </p>
          <div>
            <UiButton
              variant="text"
              size="sm"
              text="New series"
              @click="startNewSeries"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe145;" />
              </template>
            </UiButton>
          </div>
        </template>

        <!-- New -->
        <template v-else>
          <div class="d-grid gap-2">
            <UiInputText
              id="series-name"
              v-model="form.newSeriesName"
              label="Series name"
              placeholder="Ex. Color theory basics"
              size="sm"
              class="mb-0"
            />
            <p class="fs-3xs text-muted text-break mb-0">
              {{ newSeriesHint }}
            </p>
          </div>
          <UiInputTextarea
            v-if="!matchedSeries"
            id="series-description"
            v-model="form.newSeriesDescription"
            label="Description"
            placeholder="Ex. What the series covers, shown on its page"
            :rows="2"
            size="sm"
            class="mb-0"
          />
          <div>
            <UiButton
              variant="text"
              size="sm"
              text="Pick existing"
              @click="cancelNewSeries"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5c4;" />
              </template>
            </UiButton>
          </div>
        </template>

        <!-- Part -->
        <template v-if="resolvedSlug">
          <UiDivider />
          <div class="d-grid gap-2">
            <UiInputText
              id="series-order"
              :model-value="form.seriesOrder"
              label="Part"
              type="number"
              :min="1"
              size="sm"
              :error-messages="orderErrors"
              class="mb-0"
              @update:model-value="onOrderInput"
            />
            <p class="fs-3xs text-muted mb-0">
              {{ partLabel }}
            </p>
            <p
              v-if="duplicatePart"
              class="fs-3xs text-warning mb-0"
            >
              Part {{ form.seriesOrder }} is also “{{ duplicatePart.title }}”
            </p>
          </div>
          <div
            v-if="isLoadingParts"
            class="d-grid gap-2"
            role="status"
            aria-label="Loading series parts"
          >
            <div class="skeleton skeleton-ai-generation col-10" />
            <div class="skeleton skeleton-ai-generation col-8" />
          </div>
          <div
            v-else-if="preview.length > 1"
            class="d-grid gap-2"
            role="list"
            aria-label="Parts in this series"
          >
            <div
              v-for="part in preview"
              :key="part.slug"
              role="listitem"
              class="d-flex align-items-baseline gap-2 fs-3xs"
              :class="part.isCurrent ? 'fw-600 text-on-body' : 'text-muted'"
              :aria-current="part.isCurrent ? 'true' : undefined"
            >
              <span class="font-code flex-shrink-0">{{ partNumber(part) }}</span>
              <span class="text-truncate flex-grow-1">{{ part.title }}</span>
              <span
                v-if="!part.isPublished"
                class="post-status flex-shrink-0"
              >Draft</span>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UiCard>
</template>
