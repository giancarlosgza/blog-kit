<script setup lang="ts">
/** Interfaces */
interface IPostCreateForm {
  title: string
  slug: string
  color: string
}

/** Model */
const form = defineModel<IPostCreateForm>('form', { required: true })
const isSlugAuto = defineModel<boolean>('slugAuto', { default: true })

/** Composables */
const { blogHost } = useBlogUrl()

/** Computed */
const missingFields = computed(() => {
  const required: [string, unknown][] = [
    ['Title', form.value.title?.trim()],
    ['Slug', form.value.slug?.trim()]
  ]
  return required.filter(([, value]) => !value).map(([label]) => label)
})

/** Methods */
function onSlugInput(value: string | number | null): void {
  isSlugAuto.value = String(value ?? '') === toSlug(form.value.title)
}
function resetSlug(): void {
  isSlugAuto.value = true
  form.value.slug = toSlug(form.value.title)
}
</script>

<template>
  <div class="post-editor d-grid gap-3">
    <!-- Document -->
    <div class="d-grid align-content-start gap-3">
      <!-- Details -->
      <UiCard variant="pane">
        <template #header>
          <UiSubheadingContent
            title="Details"
            as="h3"
            gutter="none"
          />
        </template>
        <template #body>
          <UiInputText
            id="title"
            v-model="form.title"
            label="Title"
            placeholder="Ex. My new article"
            size="sm"
            class="mb-0"
            required autofocus
          />
        </template>
      </UiCard>

      <!-- Link -->
      <UiCard variant="pane">
        <template #header>
          <div class="d-flex justify-content-between align-items-center mb-0">
            <UiSubheadingContent
              title="Link"
              as="h3"
              gutter="none"
            />
            <UiBadge
              v-if="isSlugAuto"
              variant="outline"
              size="sm"
              text="Auto"
              icon-class="text-success"
              icon-code="&#xe061;"
            />
            <UiButton
              v-else
              variant="text"
              size="sm"
              text="Use title"
              aria-label="Generate the slug from the title again"
              rounded
              @click="resetSlug"
            />
          </div>
        </template>
        <template #body>
          <UiInputText
            id="slug"
            v-model="form.slug"
            label="Slug"
            placeholder="Ex. my-new-article"
            size="sm"
            class="mb-2"
            required
            @update="onSlugInput"
          />
          <p class="fs-3xs text-muted text-break mb-0">
            {{ blogHost }}/{{ form.slug || '…' }}
          </p>
        </template>
      </UiCard>

      <!-- Appearance -->
      <UiCard variant="pane">
        <template #header>
          <UiSubheadingContent
            title="Appearance"
            as="h3"
            gutter="none"
          />
        </template>
        <template #body>
          <UiInputColorPicker
            id="color"
            v-model="form.color"
            label="Color"
            size="sm"
            class="mb-0"
          />
        </template>
      </UiCard>
    </div>

    <aside class="post-editor-aside d-grid align-content-start gap-3">
      <!-- Preview -->
      <UiCard variant="pane">
        <template #body>
          <div class="d-grid gap-3">
            <div>
              <span
                class="post-editor-swatch"
                :style="{ '--_post-editor-color': form.color || '#e0e0e0' }"
              />
            </div>
            <h2 class="text-card-title text-break mb-0">
              {{ form.title?.trim() || 'Title' }}
            </h2>
            <div>
              <p class="subtitle-2 font-secondary text-link text-info text-break d-inline-block mb-0">
                <UiIconMaterial icon-code="&#xe157;" class="fs-sm" />
                {{ form.slug || 'slug' }}
              </p>
            </div>
          </div>
        </template>
        <template #footer>
          <UiBadgeGroup class="gap-1">
            <UiBadge
              variant="outline"
              size="sm"
              icon-code="&#xe061;"
              icon-class="fs-sm text-warning"
              text="Draft"
            />
            <UiBadge
              variant="outline"
              size="sm"
              :text="form.color || 'No color'"
              icon-code="&#xe061;"
              :icon-style="{ color: form.color || '#e0e0e0' }"
            />
          </UiBadgeGroup>
        </template>
      </UiCard>

      <!-- Status -->
      <UiAlert
        type="tonal"
        :variant="missingFields.length ? 'warning' : 'success'"
        size="sm"
        :message="missingFields.length ? `Missing: ${missingFields.join(', ')}` : 'Ready to create'"
      />
    </aside>
  </div>
</template>
