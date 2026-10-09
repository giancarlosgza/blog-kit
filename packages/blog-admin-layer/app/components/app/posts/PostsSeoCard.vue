<script setup lang="ts">
import type { IResolvedPostSeo } from '@giancarlosgza/blog-core'
import type { IPostEditorForm } from '#admin/app/composables/usePostEditor'
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from '@giancarlosgza/blog-core'

/** Props */
const props = defineProps<{
  slug: string
  seo: IResolvedPostSeo
  fallback: IResolvedPostSeo
}>()

/** Model */
const form = defineModel<IPostEditorForm>('form', { required: true })

/** Data */
const imageFile = ref<File | null>(null)

/** Composables */
const {
  isUploading,
  progress,
  error: uploadError,
  upload
} = useImageUpload()
const {
  loadingState,
  seoProposal,
  errorFor,
  safetyRatingsFor,
  suggestSeo,
  applySeo,
  dismissSeo
} = usePostAi()

/** Computed */
const titleLength = computed(() => props.seo.title.length)
const descriptionLength = computed(() => props.seo.description.length)
const imageSource = computed(() => {
  if (form.value.ogImageURL.trim())
    return 'custom'
  return form.value.imageURL ? 'cover' : 'generated'
})
const canonicalErrors = computed(() => urlErrors(form.value.canonicalURL))
const imageUrlErrors = computed(() => urlErrors(form.value.ogImageURL))
const hasBothSuggestions = computed(() => !!seoProposal.value?.seoTitle && !!seoProposal.value?.seoDescription)

/** Methods */
function urlErrors(value: string): string[] {
  return value.trim() && !isAbsoluteHttpUrl(value) ? ['Use an absolute http(s) URL'] : []
}

/** Watch */
watch(imageFile, async (file) => {
  if (!file)
    return
  try {
    form.value.ogImageURL = await upload(file, `seo/${props.slug || 'post'}`)
  } catch {
  } finally {
    imageFile.value = null
  }
})
</script>

<template>
  <UiCard variant="pane">
    <template #header>
      <div class="d-flex justify-content-between align-items-center mb-0">
        <UiSubheadingContent
          title="SEO"
          as="h3"
          gutter="none"
        />
        <UiButtonTooltip
          id="seo-ai"
          variant="text"
          size="sm"
          icon
          class="ai-trigger"
          tooltip-text="Suggest SEO title and description with AI"
          :loading="loadingState.seo"
          @click="suggestSeo"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe65f;" class="text-accent" />
          </template>
        </UiButtonTooltip>
      </div>
    </template>
    <template #body>
      <div class="d-grid gap-3">
        <!-- AI -->
        <AppAiErrorAlert
          :message="errorFor('seo')"
          :safety-ratings="safetyRatingsFor('seo')"
        />
        <div
          v-if="loadingState.seo"
          class="d-grid gap-2"
          role="status"
          aria-label="SEO suggestions are being generated"
        >
          <div class="skeleton skeleton-ai-generation col-10" />
          <div class="skeleton skeleton-ai-generation col-12" />
          <div class="skeleton skeleton-ai-generation col-8" />
        </div>
        <div
          v-else-if="seoProposal"
          class="ai-panel d-grid gap-3 p-2"
        >
          <div class="d-flex justify-content-between align-items-center ps-1">
            <p class="fs-3xs fw-600 mb-0">
              SEO suggestions
            </p>
            <UiButtonTooltip
              id="seo-ai-dismiss"
              variant="text"
              size="sm"
              icon
              tooltip-text="Dismiss SEO suggestions"
              @click="dismissSeo"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5cd;" />
              </template>
            </UiButtonTooltip>
          </div>
          <div
            v-if="seoProposal.seoTitle"
            class="d-grid gap-2 ps-1"
          >
            <p class="caption fw-400 text-muted mb-0">
              Title ·
              <span :class="seoProposal.seoTitle.length > SEO_TITLE_MAX ? 'text-warning' : ''">
                {{ seoProposal.seoTitle.length }} / {{ SEO_TITLE_MAX }}
              </span>
            </p>
            <p class="subtitle-2 lh-md mb-0">
              {{ seoProposal.seoTitle }}
            </p>
            <div>
              <UiButton
                variant="text"
                size="sm"
                text="Apply title"
                @click="applySeo('seoTitle')"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe5ca;" />
                </template>
              </UiButton>
            </div>
          </div>
          <div
            v-if="seoProposal.seoDescription"
            class="d-grid gap-2 ps-1"
          >
            <p class="caption fw-400 text-muted mb-0">
              Description ·
              <span :class="seoProposal.seoDescription.length > SEO_DESCRIPTION_MAX ? 'text-warning' : ''">
                {{ seoProposal.seoDescription.length }} / {{ SEO_DESCRIPTION_MAX }}
              </span>
            </p>
            <p class="subtitle-2 lh-md mb-0">
              {{ seoProposal.seoDescription }}
            </p>
            <div>
              <UiButton
                variant="text"
                size="sm"
                text="Apply description"
                @click="applySeo('seoDescription')"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe5ca;" />
                </template>
              </UiButton>
            </div>
          </div>
          <UiDivider />
          <UiButtonGroup connected>
            <UiButton
              v-if="hasBothSuggestions"
              variant="filled"
              size="sm"
              text="Apply both"
              @click="applySeo('both')"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5ca;" />
              </template>
            </UiButton>
            <UiButton
              variant="text"
              size="sm"
              text="Discard"
              @click="dismissSeo"
            />
          </UiButtonGroup>
        </div>

        <!-- Title -->
        <div class="d-grid gap-2">
          <UiInputText
            id="seo-title"
            v-model="form.seoTitle"
            label="SEO title"
            :placeholder="`Using: ${fallback.title}`"
            size="sm"
            class="mb-0"
          />
          <p
            class="fs-3xs text-end mb-0"
            :class="titleLength > SEO_TITLE_MAX ? 'text-warning' : 'text-muted'"
          >
            {{ titleLength }} / {{ SEO_TITLE_MAX }}
          </p>
        </div>

        <!-- Description -->
        <div class="d-grid gap-2">
          <UiInputTextarea
            id="seo-description"
            v-model="form.seoDescription"
            label="SEO description"
            :placeholder="fallback.description ? `Using: ${fallback.description}` : 'Ex. A one or two sentence summary for search results'"
            :rows="3"
            size="sm"
            class="mb-0"
          />
          <p
            class="fs-3xs text-end mb-0"
            :class="descriptionLength > SEO_DESCRIPTION_MAX ? 'text-warning' : 'text-muted'"
          >
            {{ descriptionLength }} / {{ SEO_DESCRIPTION_MAX }}
          </p>
        </div>

        <!-- Social image -->
        <div class="d-grid gap-3">
          <div
            v-if="form.ogImageURL"
            class="d-grid gap-2"
          >
            <img
              :src="form.ogImageURL"
              :alt="seo.imageAlt || 'Social image preview'"
              class="post-editor-social-image"
            >
            <div>
              <UiButton
                variant="text"
                color="danger"
                size="sm"
                text="Remove social image"
                @click="form.ogImageURL = ''"
              >
                <template #icon>
                  <UiIconMaterial
                    icon-code="&#xe872;"
                    class="text-danger"
                  />
                </template>
              </UiButton>
            </div>
          </div>
          <UiInputText
            id="seo-og-image"
            v-model="form.ogImageURL"
            label="Social image URL"
            :placeholder="form.imageURL ? 'Using: cover image' : 'Using: generated card'"
            type="url"
            size="sm"
            :error-messages="imageUrlErrors"
            class="mb-0"
          />
          <UiInputFile
            id="seo-og-image-file"
            v-model="imageFile"
            label="Upload social image"
            input-label="Drop or select a 1200 × 630 image"
            accept="image/*"
            size="sm"
            class="mb-0"
          />
          <UiAlert
            v-if="isUploading"
            type="tonal"
            variant="info"
            size="sm"
            :message="`Uploading social image... ${progress}%`"
          />
          <UiAlert
            v-if="uploadError"
            type="tonal"
            variant="danger"
            size="sm"
            :message="uploadError"
          />
        </div>

        <UiDivider />

        <!-- Previews -->
        <AppPostsSeoPreview
          :seo="seo"
          :image-source="imageSource"
          :color="form.color"
        />

        <UiDivider />

        <!-- Canonical -->
        <div class="d-grid gap-2">
          <UiInputText
            id="seo-canonical"
            v-model="form.canonicalURL"
            label="Canonical URL"
            :placeholder="`Using: ${fallback.canonical}`"
            type="url"
            size="sm"
            :error-messages="canonicalErrors"
            class="mb-0"
          />
          <p class="fs-3xs text-muted mb-0">
            Only for content republished from another site
          </p>
        </div>

        <!-- Indexing -->
        <div class="d-grid gap-2">
          <UiInputCheck
            id="seo-noindex"
            v-model="form.noindex"
            size="sm"
            label="Hide from search engines"
            variant="switch"
            class="mb-0"
          />
          <p class="fs-3xs text-muted mb-0">
            {{ form.noindex ? 'Adds noindex and leaves the post out of the sitemap. It stays public by link' : 'Search engines can index this post' }}
          </p>
        </div>
      </div>
    </template>
  </UiCard>
</template>
