<script setup lang="ts">
import type { ISafetyRating } from '#admin/shared/models/gemini'

/** Props */
defineProps<{
  title?: string
  message: string | null
  safetyRatings?: ISafetyRating[] | null
}>()
</script>

<template>
  <UiAlert
    v-if="message"
    type="tonal"
    variant="danger"
    size="sm"
    :title="title"
    :message="message"
  >
    <template #icon>
      <UiIconMaterial icon-code="&#xe000;" />
    </template>
    <template
      v-if="safetyRatings?.length"
      #content
    >
      <p class="mt-2">
        Safety ratings:
      </p>
      <UiListGroup class="mt-2">
        <li
          v-for="(rating, indexRating) in safetyRatings"
          :key="`rating-${indexRating}`"
          class="list-group-item"
        >
          <div class="list-item">
            {{ rating.category }}: {{ rating.probability }}
          </div>
        </li>
      </UiListGroup>
    </template>
  </UiAlert>
</template>
