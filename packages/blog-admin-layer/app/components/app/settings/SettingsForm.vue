<script setup lang="ts">
import type { ISettings } from '@giancarlosgza/blog-core'

/** Model */
const form = defineModel<ISettings>('form', { required: true })

/** Data */
const logoFile = ref<File | null>(null)
const newKeyword = ref<string>('')

/** Composables */
const {
  isUploading,
  progress: uploadProgress,
  error: uploadError,
  upload
} = useImageUpload()

/** Computed */
const keywords = computed<string[]>(() => (form.value.blogKeywords || '').split(',').map(keyword => keyword.trim()).filter(Boolean))
const keywordChips = computed(() => keywords.value.map(keyword => ({ id: keyword, text: keyword, closable: true })))
const missingFields = computed(() => {
  const required: [string, unknown][] = [
    ['Blog name', form.value.blogName?.trim()],
    ['Description', form.value.blogDescription?.trim()],
    ['Keywords', keywords.value.length],
    ['Blog URL', form.value.blogURL?.trim()]
  ]
  return required.filter(([, value]) => !value).map(([label]) => label)
})

/** Watch */
watch(logoFile, async (file) => {
  if (!file)
    return
  try {
    form.value.logoURL = await upload(file, 'logos')
  } catch {
  } finally {
    logoFile.value = null
  }
})

/** Methods */
function addKeywords() {
  const additions = newKeyword.value.split(',').map(keyword => keyword.trim()).filter(keyword => keyword && !keywords.value.includes(keyword))
  if (additions.length) {
    form.value.blogKeywords = [...keywords.value, ...additions].join(', ')
  }
  newKeyword.value = ''
}
function removeKeyword(keyword: string) {
  form.value.blogKeywords = keywords.value.filter(item => item !== keyword).join(', ')
}
</script>

<template>
  <div class="settings-editor d-grid gap-3">
    <!-- Document -->
    <div class="d-grid align-content-start gap-3">
      <!-- Branding -->
      <UiCard variant="pane">
        <template #header>
          <UiSubheadingContent
            title="Branding"
            as="h3"
            gutter="none"
          />
        </template>
        <template #body>
          <div class="d-grid gap-3">
            <UiInputText
              id="blog-name"
              v-model="form.blogName"
              label="Blog name"
              placeholder="Ex. My Blog"
              size="sm"
              required
            />
            <UiInputTextarea
              id="blog-description"
              v-model="form.blogDescription"
              label="Description"
              placeholder="Ex. A blog about color, design and gradients"
              :rows="3"
              size="sm"
              required
            />
            <div class="d-grid gap-2 mb-3">
              <div class="d-flex align-items-end gap-2">
                <UiInputText
                  id="blog-keyword"
                  v-model="newKeyword"
                  label="Keywords *"
                  placeholder="Ex. color, design, gradients"
                  size="sm"
                  class="flex-grow-1 mb-0"
                  @keydown.enter.prevent="addKeywords"
                />
                <UiButton
                  variant="outline"
                  size="sm"
                  text="Add"
                  :disabled="!newKeyword.trim()"
                  @click="addKeywords"
                >
                  <template #icon>
                    <UiIconMaterial icon-code="&#xe145;" />
                  </template>
                </UiButton>
              </div>
              <p class="fs-3xs text-muted">
                Press Enter to add, separate several with commas
              </p>
              <UiChipGroup
                v-if="keywordChips.length"
                :options="keywordChips"
                variant="outline"
                color="secondary"
                aria-label="Blog keywords"
                @remove="removeKeyword"
              />
            </div>
            <div class="d-grid gap-2">
              <UiInputText
                id="blog-url"
                v-model="form.blogURL"
                label="Blog URL"
                type="url"
                placeholder="https://blog.example.com"
                size="sm"
                class="mb-0"
                required
              />
              <p class="fs-3xs text-muted mb-0">
                Public address used for canonical links and sharing
              </p>
            </div>
          </div>
        </template>
      </UiCard>
    </div>

    <aside class="settings-editor-aside d-grid align-content-start gap-3">
      <!-- Logo -->
      <UiCard variant="pane">
        <template #header>
          <div class="d-flex justify-content-between align-items-center mb-0">
            <UiSubheadingContent
              title="Logo"
              as="h3"
              gutter="none"
            />
            <UiButton
              v-if="form.logoURL"
              variant="text"
              size="sm"
              color="danger"
              text="Remove"
              @click="form.logoURL = ''"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe872;" />
              </template>
            </UiButton>
          </div>
        </template>
        <template #body>
          <div class="d-grid gap-3">
            <div class="settings-logo-preview">
              <img
                v-if="form.logoURL"
                :src="form.logoURL"
                :alt="`${form.blogName || 'Blog'} logo`"
              >
              <UiIconMaterial
                v-else
                icon-code="&#xe3f4;"
                class="fs-2xl text-muted"
              />
            </div>
            <UiInputFile
              id="logo-file"
              v-model="logoFile"
              label="Upload new logo"
              input-label="Drop or select a logo"
              accept="image/*"
              size="sm"
              class="mb-0"
            />
            <UiAlert
              v-if="isUploading"
              type="tonal"
              variant="info"
              size="sm"
              :message="`Uploading logo... ${uploadProgress}%`"
            />
            <UiAlert
              v-if="uploadError"
              type="tonal"
              variant="danger"
              size="sm"
              :message="uploadError"
            />
          </div>
        </template>
      </UiCard>

      <!-- Colors -->
      <UiCard variant="pane">
        <template #header>
          <UiSubheadingContent
            title="Colors"
            as="h3"
            gutter="none"
          />
        </template>
        <template #body>
          <div class="d-grid gap-3">
            <UiInputColorPicker
              id="primary-color"
              v-model="form.primaryColor"
              label="Primary color"
              size="sm"
            />
            <UiInputColorPicker
              id="background-color"
              v-model="form.backgroundColor"
              label="Background color"
              size="sm"
              class="mb-0"
            />
          </div>
        </template>
      </UiCard>

      <!-- Status -->
      <UiAlert
        type="tonal"
        :variant="missingFields.length ? 'warning' : 'success'"
        size="sm"
        :message="missingFields.length ? `Missing: ${missingFields.join(', ')}` : 'Ready to save'"
      />
    </aside>
  </div>
</template>
