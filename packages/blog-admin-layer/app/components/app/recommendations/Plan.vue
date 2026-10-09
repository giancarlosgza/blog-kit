<script setup lang="ts">
import type { IRecommendationPin, IRecommendationPlanAction } from '#admin/shared/models/recommendation'

/** Interfaces */
interface IProps {
  pins: IRecommendationPin[]
  hasRun: boolean
  actions: IRecommendationPlanAction[]
}
interface IEmits {
  remove: [pin: IRecommendationPin]
  generate: [pin: IRecommendationPin, actionId: string]
  copy: []
}

/** Props */
defineProps<IProps>()

/** Emit */
const emit = defineEmits<IEmits>()

/** Methods */
function formatPinMeta(meta: string): string {
  const legacyTheme = meta.match(/^(.+) theme$/i)
  const text = legacyTheme ? `Theme · ${legacyTheme[1]}` : meta
  return text.charAt(0).toUpperCase() + text.slice(1)
}
</script>

<template>
  <UiCard
    variant="pane"
    class="trend-plan"
  >
    <template #header>
      <div class="d-flex align-items-center justify-content-between gap-2">
        <div>
          <h3 class="fs-base fw-500 mb-0">
            Your plan
          </h3>
          <p class="caption text-muted mb-0">
            Pinned from this chat and the month boards. Saved on the chat.
          </p>
        </div>
        <UiButtonTooltip
          id="recommendations-copy-plan"
          variant="text"
          size="sm"
          icon
          tooltip-text="Copy plan"
          aria-label="Copy the pinned ideas"
          :disabled="!pins.length"
          @click="emit('copy')"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe14d;" />
          </template>
        </UiButtonTooltip>
      </div>
    </template>
    <template #body>
      <UiEmpty
        v-if="!pins.length"
        title="Nothing pinned yet"
        :subtitle="hasRun ? 'Pin an idea in the chat or a theme in Topics.' : 'Ask for recommendations first, then pin the ideas you want to keep.'"
        use-custom-icon
        icon-code="&#xe6aa;"
      />
      <UiListGroup
        v-else
        variant="flush"
        size="sm"
        is-undecorated
      >
        <UiListItem
          v-for="(pin, index) in pins"
          :key="pin.id"
          :title="pin.label"
          :text="formatPinMeta(pin.meta)"
          has-actions
        >
          <template #list-action>
            <UiButtonMenu
              :id="`plan-pin-${index}`"
              variant="text"
              size="sm"
              icon
              custom-class="text-neutral"
              tooltip-text="Pin options"
              :aria-label="`Options for ${pin.label}`"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5d4;" />
              </template>
              <template #menu>
                <UiButtonMenuItem
                  v-for="action in actions"
                  :key="action.id"
                  :item-text="action.label"
                  :icon="action.icon"
                  @click="emit('generate', pin, action.id)"
                />
                <UiButtonMenuDivider v-if="actions.length" />
                <UiButtonMenuItem
                  item-text="Remove"
                  icon="&#xe872;"
                  is-destructive
                  @click="emit('remove', pin)"
                />
              </template>
            </UiButtonMenu>
          </template>
        </UiListItem>
      </UiListGroup>
    </template>
  </UiCard>
</template>
