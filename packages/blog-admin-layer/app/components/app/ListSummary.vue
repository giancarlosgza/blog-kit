<script setup lang="ts">
/** Interfaces */
interface IListSummaryStat {
  label: string
  value: string
  iconCode: string
  color: string
}
interface IListSummaryProps {
  id: string
  title: string
  itemLabel: string
  shown: number
  total?: number | null
  stats?: IListSummaryStat[]
}

/** Props */
const props = withDefaults(defineProps<IListSummaryProps>(), {
  total: null,
  stats: () => []
})

/** Computed */
const anchorName = computed<string>(() => `--${props.id}`)
const shownPercent = computed<number>(() => (props.total ? Math.min(100, Math.round((props.shown / props.total) * 100)) : 0))
const countLabel = computed<string>(() => (props.total === null
  ? props.itemLabel
  : `of ${props.total.toLocaleString('en-US')} ${props.itemLabel}`))
</script>

<template>
  <UiButton
    variant="outline"
    size="sm"
    icon
    :aria-label="`${props.title} summary`"
    :popovertarget="props.id"
    :style="{ anchorName }"
  >
    <template #icon>
      <UiIconMaterial icon-code="&#xe88e;" />
    </template>
  </UiButton>
  <UiPopover
    :id="props.id"
    :anchor-name="anchorName"
    position-block="bottom"
    position-inline="right"
  >
    <template #header>
      <p class="popover-title">
        {{ props.title }}
      </p>
      <p class="popover-subtitle">
        Loaded in this view
      </p>
    </template>
    <template #body>
      <div class="d-grid gap-3">
        <!-- Count -->
        <div class="d-grid gap-2">
          <div class="d-flex align-items-baseline gap-2">
            <span class="font-secondary fw-600 fs-2xl lh-1">
              {{ props.shown.toLocaleString('en-US') }}
            </span>
            <span class="fs-3xs text-muted">
              {{ countLabel }}
            </span>
          </div>
          <UiProgressBar
            v-if="props.total"
            :value="shownPercent"
            size="sm"
            :aria-label="`${props.shown} ${countLabel} loaded`"
          />
        </div>

        <!-- Stats -->
        <div
          v-if="props.stats.length"
          class="d-grid gap-2"
        >
          <div
            v-for="stat in props.stats"
            :key="stat.label"
            class="d-flex align-items-center gap-3"
          >
            <span
              class="d-inline-flex p-1 rounded-md bg-opacity-20"
              :class="`bg-${stat.color}-fixed`"
            >
              <UiIconMaterial
                :icon-code="stat.iconCode"
                class="fs-lg lh-1"
                :class="`text-${stat.color}`"
              />
            </span>
            <span class="fs-3xs text-muted flex-grow-1">
              {{ stat.label }}
            </span>
            <span class="fs-xs fw-600 tabular-numbers">
              {{ stat.value }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </UiPopover>
</template>
