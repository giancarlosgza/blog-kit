<script setup lang="ts">
import type { IAuthor } from '#admin/shared/models/author'

/** Props */
const props = withDefaults(defineProps<{
  isEditing?: boolean
}>(), {
  isEditing: false
})

/** Model */
const form = defineModel<IAuthor>('form', { required: true })

/** Data */
const photoFile = ref<File | null>(null)

/** Composables */
const { blogHost } = useBlogUrl()
const {
  isUploading: isUploadingPhoto,
  progress: photoProgress,
  error: photoError,
  upload: uploadPhoto
} = useImageUpload()

/** Computed */
const trimmedName = computed(() => form.value.name?.trim() || '')
const generatedSlug = computed(() => toSlug(form.value.name || ''))
const isSlugAuto = computed(() => !form.value.slug || form.value.slug === generatedSlug.value)
const missingFields = computed(() => {
  const required: [string, unknown][] = [
    ['Name', trimmedName.value]
  ]
  return required.filter(([, value]) => !value).map(([label]) => label)
})

/** Watch */
watch(() => form.value.name, (newName, oldName) => {
  if (props.isEditing)
    return
  if (!form.value.slug || form.value.slug === toSlug(oldName || '')) {
    form.value.slug = toSlug(newName || '')
  }
})
watch(photoFile, async (file) => {
  if (!file)
    return
  try {
    form.value.photoURL = await uploadPhoto(file, `authors/${form.value.uid || form.value.slug || 'misc'}`)
  } catch {
  } finally {
    photoFile.value = null
  }
})

/** Methods */
function regenerateSlug() {
  form.value.slug = generatedSlug.value
}
</script>

<template>
  <div class="author-editor d-grid gap-3">
    <!-- Document -->
    <div class="d-grid align-content-start gap-3">
      <!-- Details -->
      <UiCard variant="pane">
        <template #header>
          <div class="d-flex justify-content-between align-items-center mb-0">
            <UiSubheadingContent
              title="Details"
              as="h3"
              gutter="none"
            />
            <UiBadge
              v-if="isSlugAuto"
              variant="outline"
              size="sm"
              text="Auto slug"
              icon-class="text-success"
              icon-code="&#xe061;"
            />
            <UiButton
              v-else
              variant="text"
              size="sm"
              text="Regenerate slug"
              @click="regenerateSlug"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5d5;" />
              </template>
            </UiButton>
          </div>
        </template>
        <template #body>
          <div class="d-grid gap-3">
            <UiInputText
              id="name"
              v-model="form.name"
              label="Name"
              placeholder="Ex. Jane Doe"
              size="sm"
              class="mb-0"
              required autofocus
            />
            <div class="d-grid gap-2">
              <UiInputText
                id="slug"
                v-model="form.slug"
                label="Slug"
                placeholder="Ex. jane-doe"
                size="sm"
                class="mb-0"
              />
              <p class="fs-3xs text-muted text-break mb-0">
                {{ blogHost }}/authors/{{ form.slug || '…' }}
              </p>
            </div>
            <UiInputTextarea
              id="description"
              v-model="form.description"
              label="Description"
              placeholder="Ex. Short author bio"
              :rows="4"
              size="sm"
              class="mb-0"
            />
          </div>
        </template>
      </UiCard>

      <!-- Link -->
      <UiCard variant="pane">
        <template #header>
          <UiSubheadingContent
            title="Link"
            as="h3"
            gutter="none"
          />
        </template>
        <template #body>
          <UiInputText
            id="profile-link"
            v-model="form.profileLink"
            label="Profile link"
            type="url"
            placeholder="Ex. https://x.com/username"
            size="sm"
            class="mb-2"
          />
          <p class="fs-3xs text-muted mb-0">
            Personal site or social profile shown on the author page
          </p>
        </template>
      </UiCard>
    </div>

    <aside class="author-editor-aside d-grid align-content-start gap-3">
      <!-- Preview -->
      <UiCard
        variant="pane"
        :class="{ 'selected-author': isEditing }"
      >
        <template #body>
          <div class="d-grid gap-3">
            <div>
              <UiAvatar
                v-if="form.photoURL"
                :src="form.photoURL"
                :alt="`${trimmedName || 'Author'} photo`"
                size="md"
                class="mx-0"
              />
              <UiAvatar
                v-else
                :initials="getInitials(trimmedName)"
                size="md"
                color="secondary"
                variant="filled"
                class="mx-0"
              />
            </div>
            <div class="d-grid gap-1">
              <h2 class="text-card-title mb-0">
                {{ trimmedName || 'Name' }}
              </h2>
              <p class="fs-3xs text-muted text-break mb-0">
                /{{ form.slug || 'slug' }}
              </p>
            </div>
            <p
              v-if="form.description?.trim()"
              class="subtitle-2 text-muted mb-0"
            >
              {{ truncateText(form.description, 140) }}
            </p>
          </div>
        </template>
      </UiCard>

      <!-- Photo -->
      <UiCard variant="pane">
        <template #header>
          <div class="d-flex justify-content-between align-items-center mb-0">
            <UiSubheadingContent
              title="Photo"
              as="h3"
              gutter="none"
            />
            <UiButton
              v-if="form.photoURL"
              variant="text"
              size="sm"
              color="danger"
              text="Remove"
              @click="form.photoURL = ''"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe872;" />
              </template>
            </UiButton>
          </div>
        </template>
        <template #body>
          <div class="d-grid gap-3">
            <UiInputFile
              id="photo-file"
              v-model="photoFile"
              label="Upload new photo"
              input-label="Drop or select photo"
              accept="image/*"
              size="sm"
              class="mb-0"
            />
            <p class="fs-3xs text-muted mb-0">
              Raster images are optimized to WebP before upload
            </p>
            <UiAlert
              v-if="isUploadingPhoto"
              type="tonal"
              variant="info"
              size="sm"
              :message="`Uploading photo... ${photoProgress}%`"
            />
            <UiAlert
              v-if="photoError"
              type="tonal"
              variant="danger"
              size="sm"
              :message="photoError"
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
