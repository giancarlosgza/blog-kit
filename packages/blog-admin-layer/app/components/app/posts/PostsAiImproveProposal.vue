<script setup lang="ts">
/** Composables */
const { improveProposal, currentBodyHtml, applyImproveProposal, dismissImproveProposal } = usePostAi()
</script>

<template>
  <div
    v-if="improveProposal"
    class="ai-panel d-grid gap-3 p-3"
  >
    <div class="d-flex justify-content-between align-items-center">
      <div class="d-flex align-items-center gap-2">
        <UiIconMaterial
          icon-code="&#xe65f;"
          class="text-accent fs-base"
        />
        <p class="subtitle-2 fw-800 mb-0">
          Improved writing
        </p>
      </div>
      <UiButtonTooltip
        id="improve-proposal-dismiss"
        variant="text"
        size="sm"
        icon
        tooltip-text="Discard proposal"
        @click="dismissImproveProposal"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5cd;" />
        </template>
      </UiButtonTooltip>
    </div>

    <div class="d-grid grid-repeat-cols-md-2 gap-3">
      <div class="d-grid align-content-start gap-2 border rounded-md p-2">
        <p class="caption fw-600 text-muted text-uppercase">
          Current
        </p>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="post-editor-ai-preview rich-editor-content" v-html="currentBodyHtml" />
      </div>
      <div class="d-grid align-content-start gap-2 bg-accent-fixed bg-opacity-10 border rounded-md p-2">
        <p class="caption fw-600 text-muted text-uppercase">
          Proposed
        </p>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="post-editor-ai-preview rich-editor-content" v-html="improveProposal" />
      </div>
    </div>

    <p class="fs-3xs text-muted mb-0">
      Replacing updates the editor only, nothing is saved until you save the draft
    </p>
    <UiDivider />
    <UiButtonGroup connected>
      <UiButton
        variant="filled"
        size="sm"
        text="Replace content"
        @click="applyImproveProposal"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5ca;" />
        </template>
      </UiButton>
      <UiButton
        variant="text"
        size="sm"
        text="Discard"
        @click="dismissImproveProposal"
      />
    </UiButtonGroup>
  </div>
</template>
