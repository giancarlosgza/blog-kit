<script setup lang="ts">
/** Constants */
const TOOLBAR_BUTTONS = 9
const BODY_LINES = ['100%', '96%', '88%', '100%', '72%', '94%', '60%']
const ASIDE_CARDS = [
  { id: 'visibility', lines: ['100%', '70%'], field: true },
  { id: 'author', lines: ['55%'], field: true },
  { id: 'tags', lines: [], field: true, chips: 3 }
]
</script>

<template>
  <div
    class="post-editor d-grid gap-3"
    role="status"
    aria-label="Loading post"
  >
    <!-- Document -->
    <div
      class="d-grid align-content-start gap-3"
      aria-hidden="true"
    >
      <!-- Details -->
      <UiCard variant="pane">
        <template #header>
          <UiBaseSkeleton
            size="md"
            width="6rem"
          />
        </template>
        <template #body>
          <div class="d-grid gap-4">
            <div class="d-grid gap-2">
              <UiBaseSkeleton width="3rem" />
              <UiBaseSkeleton
                width="100%"
                height="2.75rem"
                custom-class="rounded-md"
              />
            </div>
            <div class="d-grid gap-2">
              <UiBaseSkeleton width="4.5rem" />
              <UiBaseSkeleton
                width="100%"
                height="5.5rem"
                custom-class="rounded-md"
              />
            </div>
          </div>
        </template>
      </UiCard>

      <!-- Content -->
      <UiCard variant="pane">
        <template #header>
          <div class="d-flex justify-content-between align-items-center gap-2">
            <UiBaseSkeleton
              size="md"
              width="7rem"
            />
            <UiBaseSkeleton
              width="6.5rem"
              height="2rem"
              rounded
            />
          </div>
        </template>
        <template #body>
          <div class="d-grid gap-4">
            <div class="d-flex flex-wrap gap-2">
              <UiBaseSkeleton
                v-for="index in TOOLBAR_BUTTONS"
                :key="`toolbar-${index}`"
                width="2rem"
                height="2rem"
                custom-class="rounded-md"
              />
            </div>
            <div class="d-grid gap-3">
              <UiBaseSkeleton
                size="md"
                width="45%"
              />
              <UiBaseSkeleton
                v-for="(width, index) in BODY_LINES"
                :key="`line-${index}`"
                :width="width"
              />
            </div>
          </div>
        </template>
      </UiCard>
    </div>

    <!-- Aside -->
    <div
      class="post-editor-aside d-grid align-content-start gap-3"
      aria-hidden="true"
    >
      <!-- Status -->
      <UiCard variant="pane">
        <template #header>
          <div class="d-flex justify-content-between align-items-center">
            <UiBaseSkeleton
              size="md"
              width="4rem"
            />
            <UiBaseSkeleton width="4.5rem" />
          </div>
        </template>
        <template #body>
          <div class="d-grid gap-3">
            <div class="d-flex justify-content-between align-items-center gap-2">
              <UiBaseSkeleton
                v-for="index in 3"
                :key="`step-${index}`"
                variant="thumbnail"
                width="1.75rem"
                height="1.75rem"
                rounded
              />
            </div>
            <UiBaseSkeleton
              width="100%"
              height="2.5rem"
              rounded
            />
            <UiBaseSkeleton width="80%" />
          </div>
        </template>
      </UiCard>

      <!-- Visibility, author and tags -->
      <UiCard
        v-for="card in ASIDE_CARDS"
        :key="card.id"
        variant="pane"
      >
        <template #header>
          <UiBaseSkeleton
            size="md"
            width="5rem"
          />
        </template>
        <template #body>
          <div class="d-grid gap-2">
            <UiBaseSkeleton
              v-for="(width, index) in card.lines"
              :key="`${card.id}-line-${index}`"
              :width="width"
            />
            <UiBaseSkeleton
              v-if="card.field"
              width="100%"
              height="2.5rem"
              custom-class="rounded-md"
            />
            <div
              v-if="card.chips"
              class="d-flex gap-2"
            >
              <UiBaseSkeleton
                v-for="index in card.chips"
                :key="`${card.id}-chip-${index}`"
                width="4rem"
                height="1.75rem"
                rounded
              />
            </div>
          </div>
        </template>
      </UiCard>
    </div>
  </div>
</template>
