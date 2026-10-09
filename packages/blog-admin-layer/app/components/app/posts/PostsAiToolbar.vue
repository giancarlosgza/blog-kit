<script setup lang="ts">
import type { IHarmonyGemini } from '#admin/shared/models/gemini'

/** Composables */
const { models, selectedModel, isLoading, loadingState, smartFill } = usePostAi()
</script>

<template>
  <UiButtonGroup connected>
    <UiButton
      variant="outline"
      text="Smart fill"
      :loading="loadingState.smartFill"
      :disabled="isLoading"
      aria-label="Smart fill the post with AI"
      @click="smartFill"
    >
      <template #icon>
        <UiIconMaterial
          icon-code="&#xf4f6;"
          class="text-accent"
        />
      </template>
    </UiButton>
    <UiButtonMenu
      id="post-ai-model"
      variant="outline"
      icon
      tooltip-text="Select a Gemini model"
      aria-label="Select a Gemini model"
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
            @click="selectedModel = model.name as IHarmonyGemini"
          />
          <UiButtonMenuDivider v-if="groupIndex < models.length - 1" />
        </template>
      </template>
    </UiButtonMenu>
  </UiButtonGroup>
</template>
