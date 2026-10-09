<script setup lang="ts">
import type { IPostEditorForm } from '#admin/app/composables/usePostEditor'
import type { IAuthor } from '#admin/shared/models/author'
import type { ISeries } from '#admin/shared/models/series'
import type { ITag } from '#admin/shared/models/tag'
import { isValidOrder, toOrderValue } from '#admin/app/utils/post-series'
import { resolvePostSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from '#admin/shared/utils/post-seo'

/** Interfaces */
interface IProps {
  slug: string
  authors?: IAuthor[] | null
  tags?: ITag[] | null
  series?: ISeries[] | null
  isPublished?: boolean
  isSaving?: boolean
  canUnpublish?: boolean
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  authors: null,
  tags: null,
  series: null,
  isPublished: false,
  isSaving: false,
  canUnpublish: false
})

/** Emit */
const emit = defineEmits<{
  unpublish: []
}>()

/** Model */
const form = defineModel<IPostEditorForm>('form', { required: true })
const body = defineModel<string>('body', { required: true })

/** Data */
const coverFile = ref<File | null>(null)

/** Composables */
const { blogUrl, blogHost } = useBlogUrl()
const {
  isUploading: isUploadingCover,
  progress: coverProgress,
  error: coverError,
  upload: uploadCover
} = useImageUpload()
const {
  loadingState,
  hasTags,
  errorFor,
  safetyRatingsFor,
  titleSuggestions,
  excerptSuggestions,
  tagsProposal,
  suggestTitles,
  suggestExcerpts,
  suggestTags,
  improveWriting,
  applyTitle,
  applyExcerpt,
  applyTags,
  dismissTitles,
  dismissExcerpts,
  dismissTags
} = usePostAi()

/** Computed */
const authorList = computed(() => props.authors ?? [])
const tagList = computed(() => props.tags ?? [])
const selectedAuthor = computed(() => authorList.value.find(author => author.id === form.value.authorId) ?? null)
const tagChips = computed(() => form.value.tags.map(tag => ({ id: tag, text: tag, closable: true })))
const tagsProposalChips = computed(() => tagsProposal.value.map(tag => ({ id: tag, text: tag })))
const publicUrl = computed(() => `${blogHost}/${props.slug}`)
const featuredOrderErrors = computed(() => (form.value.featuredOrder === null || isValidOrder(form.value.featuredOrder) ? [] : ['Use a whole number from 1']))
const featuredHint = computed(() => {
  if (!form.value.featured)
    return 'The blog home leads with the latest post unless posts are featured'
  return props.isPublished
    ? 'Up to 3 featured posts lead the blog home, lowest order first, then newest'
    : 'Leads the blog home once published, lowest order first, then newest'
})
const seoSource = computed(() => ({
  slug: props.slug,
  title: form.value.title,
  shortText: form.value.shortText,
  imageURL: form.value.imageURL,
  imageAlt: form.value.imageAlt,
  seoTitle: form.value.seoTitle,
  seoDescription: form.value.seoDescription,
  ogImageURL: form.value.ogImageURL,
  canonicalURL: form.value.canonicalURL,
  noindex: form.value.noindex
}))
const seoOptions = computed(() => ({ siteUrl: blogUrl, bodyExcerpt: htmlToExcerpt(body.value, SEO_DESCRIPTION_MAX) }))
const seo = computed(() => resolvePostSeo(seoSource.value, seoOptions.value))
const seoFallback = computed(() => resolvePostSeo({ ...seoSource.value, seoTitle: '', seoDescription: '', canonicalURL: '' }, seoOptions.value))
const wordCount = computed(() => {
  const text = body.value.replace(/<[^>]+>/g, ' ').trim()
  return text ? text.split(/\s+/).length : 0
})
const missingFields = computed(() => {
  const required: [string, unknown][] = [
    ['Title', form.value.title?.trim()],
    ['Excerpt', form.value.shortText?.trim()],
    ['Author', selectedAuthor.value || form.value.authorName?.trim()],
    ['Cover', form.value.imageURL]
  ]
  return required.filter(([, value]) => !value).map(([label]) => label)
})
const seoWarnings = computed(() => {
  const warnings: string[] = []
  if (seo.value.title.length > SEO_TITLE_MAX)
    warnings.push(`SEO title is over ${SEO_TITLE_MAX} characters`)
  if (seo.value.description.length > SEO_DESCRIPTION_MAX)
    warnings.push(`SEO description is over ${SEO_DESCRIPTION_MAX} characters`)
  if (form.value.imageURL && !form.value.imageAlt.trim())
    warnings.push('Cover has no alt text, the title is used')
  if (form.value.noindex)
    warnings.push('Hidden from search engines')
  return warnings
})

/** Watch */
watch(coverFile, async (file) => {
  if (!file)
    return
  try {
    form.value.imageURL = await uploadCover(file, `covers/${props.slug || 'post'}`)
  } catch {
  } finally {
    coverFile.value = null
  }
})

/** Methods */
function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter(item => item !== tag)
}
</script>

<template>
  <div class="post-editor d-grid gap-3">
    <!-- Document -->
    <div class="d-grid align-content-start gap-3">
      <!-- Smart fill -->
      <AppAiErrorAlert
        :message="errorFor('smartFill')"
        :safety-ratings="safetyRatingsFor('smartFill')"
      />
      <AppPostsAiReview :form="form" />

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
          <div class="d-grid gap-3">
            <div class="ai-field d-grid gap-2">
              <UiButtonTooltip
                id="title-ai"
                variant="text"
                size="sm"
                icon
                class="ai-trigger"
                tooltip-text="Suggest titles with AI"
                :loading="loadingState.title"
                @click="suggestTitles"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe65f;" class="text-accent" />
                </template>
              </UiButtonTooltip>
              <UiInputText
                id="title"
                v-model="form.title"
                label="Title"
                placeholder="Ex. How to build accessible color palettes"
                size="sm"
                class="mb-0"
              />
              <AppAiErrorAlert
                :message="errorFor('title')"
                :safety-ratings="safetyRatingsFor('title')"
              />
              <AppAiSuggestionsPanel
                :suggestions="titleSuggestions"
                :loading="loadingState.title"
                title="Title ideas"
                @apply="applyTitle"
                @dismiss="dismissTitles"
              />
            </div>
            <div class="ai-field d-grid gap-2">
              <UiButtonTooltip
                id="short-text-ai"
                variant="text"
                size="sm"
                icon
                class="ai-trigger"
                tooltip-text="Suggest excerpts with AI"
                :loading="loadingState.excerpt"
                @click="suggestExcerpts"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe65f;" class="text-accent" />
                </template>
              </UiButtonTooltip>
              <UiInputTextarea
                id="short-text"
                v-model="form.shortText"
                label="Excerpt"
                placeholder="Ex. A short summary shown in post previews"
                :rows="3"
                size="sm"
                class="mb-0"
              />
              <AppAiErrorAlert
                :message="errorFor('excerpt')"
                :safety-ratings="safetyRatingsFor('excerpt')"
              />
              <AppAiSuggestionsPanel
                :suggestions="excerptSuggestions"
                :loading="loadingState.excerpt"
                title="Excerpt ideas"
                @apply="applyExcerpt"
                @dismiss="dismissExcerpts"
              />
            </div>
          </div>
        </template>
      </UiCard>

      <!-- Content -->
      <UiCard variant="pane">
        <template #header>
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-0">
            <div class="d-flex align-items-baseline gap-2">
              <UiSubheadingContent
                title="Content"
                as="h3"
                gutter="none"
              />
              <p class="fs-3xs text-muted mb-0">
                {{ wordCount }} {{ wordCount === 1 ? 'word' : 'words' }}
              </p>
            </div>
            <UiButton
              variant="outline"
              size="sm"
              text="Improve writing"
              :loading="loadingState.improve"
              @click="improveWriting"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe65f;" class="text-accent" />
              </template>
            </UiButton>
          </div>
        </template>
        <template #body>
          <div class="d-grid gap-3">
            <AppAiErrorAlert
              :message="errorFor('improve')"
              :safety-ratings="safetyRatingsFor('improve')"
            />
            <AppPostsAiImproveProposal />
            <BlogPostEditor
              v-model="body"
              :upload-path="`posts/${slug || 'post'}`"
            />
          </div>
        </template>
      </UiCard>
    </div>

    <aside class="post-editor-aside d-grid align-content-start gap-3">
      <!-- Status -->
      <slot name="status" />

      <!-- Visibility -->
      <UiCard variant="pane">
        <template #header>
          <div class="d-flex justify-content-between align-items-center mb-0">
            <UiSubheadingContent
              title="Visibility"
              as="h3"
              gutter="none"
            />
            <span
              class="post-status"
              :class="{ 'is-published': isPublished }"
            >
              {{ isPublished ? 'Live' : 'Hidden' }}
            </span>
          </div>
        </template>
        <template #body>
          <div class="d-grid gap-3">
            <p class="fs-3xs text-muted text-break mb-0">
              {{ isPublished ? `Live on ${publicUrl}` : 'Hidden from the blog until it is published' }}
            </p>
            <div v-if="isPublished && canUnpublish">
              <UiButton
                variant="outline"
                color="danger"
                size="sm"
                text="Unpublish"
                :disabled="isSaving"
                @click="emit('unpublish')"
              >
                <template #icon>
                  <UiIconMaterial
                    icon-code="&#xf236;"
                    class="text-danger"
                  />
                </template>
              </UiButton>
            </div>
            <UiDivider />
            <div class="d-grid gap-2">
              <UiInputCheck
                id="featured"
                v-model="form.featured"
                size="sm"
                label="Featured on the blog home"
                variant="switch"
                class="mb-0"
              />
              <UiInputText
                v-if="form.featured"
                id="featured-order"
                :model-value="form.featuredOrder"
                label="Featured order"
                placeholder="Ex. 1"
                type="number"
                :min="1"
                size="sm"
                :error-messages="featuredOrderErrors"
                class="mb-0"
                @update:model-value="form.featuredOrder = toOrderValue($event)"
              />
              <p class="fs-3xs text-muted mb-0">
                {{ featuredHint }}
              </p>
            </div>
          </div>
        </template>
      </UiCard>

      <!-- Author -->
      <UiCard variant="pane">
        <template #header>
          <UiSubheadingContent
            title="Author"
            as="h3"
            gutter="none"
          />
        </template>
        <template #body>
          <div class="d-grid gap-2">
            <UiInputSelect
              id="author"
              v-model="form.authorId"
              :options="authorList"
              option-label="name"
              option-value="id"
              label="Author"
              placeholder="Select an author"
              size="sm"
              class="mb-0"
            />
            <p
              v-if="form.authorUuid && !selectedAuthor"
              class="fs-3xs text-muted mb-0"
            >
              Saved author “{{ form.authorName }}” isn’t in the authors list,
              <NuxtLink
                to="/authors"
                class="text-primary"
              >
                manage authors
              </NuxtLink>
            </p>
          </div>
        </template>
      </UiCard>

      <!-- Tags -->
      <UiCard variant="pane">
        <template #header>
          <div class="d-flex justify-content-between align-items-center mb-0">
            <UiSubheadingContent
              title="Tags"
              as="h3"
              gutter="none"
            />
            <div class="d-flex align-items-center gap-2">
              <p
                v-if="form.tags.length"
                class="fs-3xs text-muted mb-0"
              >
                {{ form.tags.length }} selected
              </p>
              <UiButtonTooltip
                v-if="hasTags"
                id="tags-ai"
                variant="text"
                size="sm"
                icon
                tooltip-text="Suggest tags with AI"
                :loading="loadingState.tags"
                @click="suggestTags"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe65f;" class="text-accent" />
                </template>
              </UiButtonTooltip>
            </div>
          </div>
        </template>
        <template #body>
          <div class="d-grid gap-3">
            <UiInputMultiSelect
              id="input-tags"
              v-model="form.tags"
              size="sm"
              label="Tags"
              hide-label
              :options="tagList"
              option-label="name"
              option-value="name"
              placeholder="Select tags"
              :max-chips="0"
              max-chips-label="{count} selected"
              class="mb-0"
            >
              <template #option="{ option }">
                <UiIconMaterial
                  class="iw-bold fs-sm text-muted me-1"
                  icon-code="&#xe892;"
                />
                <span>{{ (option as ITag).name }}</span>
              </template>
            </UiInputMultiSelect>
            <UiChipGroup
              v-if="tagChips.length"
              :options="tagChips"
              variant="outline"
              color="secondary"
              aria-label="Selected tags"
              @remove="removeTag"
            />
            <AppAiErrorAlert
              :message="errorFor('tags')"
              :safety-ratings="safetyRatingsFor('tags')"
            />
            <div
              v-if="loadingState.tags"
              class="d-grid gap-2"
              role="status"
              aria-label="Tags are being matched"
            >
              <div class="skeleton skeleton-ai-generation col-8" />
            </div>
            <div
              v-else-if="tagsProposal.length"
              class="ai-panel d-grid gap-2 p-2"
            >
              <p class="fs-3xs fw-600 ps-1 mb-0">
                Suggested tags
              </p>
              <UiChipGroup
                :options="tagsProposalChips"
                variant="outline"
                color="secondary"
                aria-label="Suggested tags"
              />
              <UiButtonGroup connected>
                <UiButton
                  variant="filled"
                  size="sm"
                  text="Add tags"
                  @click="applyTags"
                >
                  <template #icon>
                    <UiIconMaterial icon-code="&#xe5ca;" />
                  </template>
                </UiButton>
                <UiButton
                  variant="text"
                  size="sm"
                  text="Discard"
                  @click="dismissTags"
                />
              </UiButtonGroup>
            </div>
          </div>
        </template>
      </UiCard>

      <!-- Series -->
      <AppPostsSeriesCard
        v-model:form="form"
        :slug="slug"
        :series="series"
        :is-published="isPublished"
      />

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

      <!-- Cover -->
      <UiCard
        variant="pane"
        class="selected-post"
      >
        <template #header>
          <div class="d-flex justify-content-between align-items-center mb-0">
            <UiSubheadingContent
              title="Cover"
              as="h3"
              gutter="none"
            />
            <UiButton
              v-if="form.imageURL"
              variant="text"
              color="danger"
              size="sm"
              text="Remove"
              @click="form.imageURL = ''"
            >
              <template #icon>
                <UiIconMaterial
                  icon-code="&#xe872;"
                  class="text-danger"
                />
              </template>
            </UiButton>
          </div>
        </template>
        <template #body>
          <div class="d-grid gap-3">
            <img
              v-if="form.imageURL"
              :src="form.imageURL"
              :alt="form.imageAlt.trim() || form.title.trim() || 'Cover preview'"
              class="post-editor-cover"
            >
            <UiInputFile
              id="cover-file"
              v-model="coverFile"
              label="Cover image"
              input-label="Drop or select a cover image"
              accept="image/*"
              size="sm"
              class="mb-0"
            />
            <UiInputText
              id="cover-alt"
              v-model="form.imageAlt"
              label="Alt text"
              :placeholder="form.title.trim() || 'Describe the cover image'"
              size="sm"
              class="mb-0"
            />
            <UiAlert
              v-if="isUploadingCover"
              type="tonal"
              variant="info"
              size="sm"
              :message="`Uploading cover... ${coverProgress}%`"
            />
            <UiAlert
              v-if="coverError"
              type="tonal"
              variant="danger"
              size="sm"
              :message="coverError"
            />
          </div>
        </template>
      </UiCard>

      <!-- SEO -->
      <AppPostsSeoCard
        v-model:form="form"
        :slug="slug"
        :seo="seo"
        :fallback="seoFallback"
      />

      <!-- Status -->
      <UiAlert
        type="tonal"
        :variant="missingFields.length ? 'warning' : 'success'"
        size="sm"
        :message="missingFields.length ? `Missing: ${missingFields.join(', ')}` : 'Ready to publish'"
        custom-class="mb-0"
      />
      <UiAlert
        v-if="seoWarnings.length"
        type="tonal"
        variant="warning"
        size="sm"
        :message="seoWarnings.join('. ')"
        custom-class="mb-0"
      />
    </aside>
  </div>
</template>
