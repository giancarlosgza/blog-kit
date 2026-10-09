<script setup lang="ts">
import type { IRecommendationMonth, IRecommendationPin, IRecommendationTheme } from '#admin/shared/models/recommendation'

/** Interfaces */
interface IProps {
  months: IRecommendationMonth[]
  pinnedIds: string[]
  canPin: boolean
}
interface IEmits {
  togglePin: [pin: IRecommendationPin]
}

/** Props */
const props = defineProps<IProps>()

/** Emit */
const emit = defineEmits<IEmits>()

/** Methods */
function pinId(month: IRecommendationMonth, theme: IRecommendationTheme): string {
  return `theme:${month.name}:${theme.label}`
}
function badgeVariant(theme: IRecommendationTheme): string {
  if (theme.state === 'gap')
    return 'tonal tonal-warning'
  if (theme.state === 'trend')
    return 'tonal tonal-secondary'
  return 'outline'
}
function onToggle(month: IRecommendationMonth, theme: IRecommendationTheme): void {
  if (!props.canPin)
    return
  emit('togglePin', { id: pinId(month, theme), label: theme.label, meta: `Theme · ${month.name}`, source: 'theme' })
}
</script>

<template>
  <UiEmpty
    v-if="!months.length"
    title="No month plan yet"
    subtitle="Start a chat or an analysis and the next three months appear here."
    use-custom-icon
    icon-code="&#xebcc;"
  />
  <div
    v-else
    class="trend-months"
  >
    <UiCard
      v-for="month in months"
      :key="month.name"
      variant="pane"
      class="trend-month"
    >
      <template #header>
        <div class="d-flex align-items-baseline justify-content-between gap-2">
          <h3 class="fs-lg fw-500 mb-0">
            {{ month.name }}
          </h3>
          <span class="caption font-code text-muted">{{ month.range }}</span>
        </div>
      </template>
      <template #body>
        <p class="caption text-muted mb-3">
          {{ month.note }}
        </p>
        <UiListGroup
          variant="flush"
          size="sm"
          is-interactive
          is-undecorated
          :aria-label="`${month.name} themes`"
        >
          <UiListItem
            v-for="theme in month.themes"
            :key="theme.label"
            :text="theme.label"
            :icon="pinnedIds.includes(pinId(month, theme)) ? '&#xe6aa;' : '&#xe145;'"
            :active="pinnedIds.includes(pinId(month, theme))"
            :clickable="canPin"
            :disabled="!canPin"
            has-actions
            :aria-pressed="pinnedIds.includes(pinId(month, theme))"
            @click="onToggle(month, theme)"
          >
            <template #list-action>
              <UiBadge
                :text="theme.badge"
                :variant="badgeVariant(theme)"
                size="sm"
              />
            </template>
          </UiListItem>
        </UiListGroup>
      </template>
    </UiCard>
  </div>
</template>
