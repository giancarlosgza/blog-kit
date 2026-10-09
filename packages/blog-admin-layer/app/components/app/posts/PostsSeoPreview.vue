<script setup lang="ts">
import type { IResolvedPostSeo } from '#admin/shared/utils/post-seo'
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from '#admin/shared/utils/post-seo'

/** Props */
const props = withDefaults(defineProps<{
  seo: IResolvedPostSeo
  imageSource?: 'custom' | 'cover' | 'generated'
  color?: string
}>(), {
  imageSource: 'generated',
  color: ''
})

/** Composables */
const { blogUrl, blogHost } = useBlogUrl()
const { blogName, defaultColor } = useAppConfig().admin

/** Computed */
// The search result shows the public blog's favicon
const faviconUrl = computed(() => {
  try {
    return new URL('/favicon.ico', blogUrl).href
  } catch {
    return '/favicon.ico'
  }
})
const canonical = computed(() => {
  try {
    return new URL(props.seo.canonical)
  } catch {
    return null
  }
})
const siteName = computed(() => !canonical.value || canonical.value.host === blogHost ? blogName : canonical.value.host)
const breadcrumb = computed(() => {
  if (!canonical.value)
    return props.seo.canonical
  const segments = canonical.value.pathname.split('/').filter(Boolean).map(segment => decodeURIComponent(segment))
  return [canonical.value.origin, ...segments].join(' › ')
})
const socialDomain = computed(() => canonical.value?.host || blogHost)
const imageSourceLabel = computed(() => ({
  custom: 'Custom social image',
  cover: 'Using the cover image',
  generated: 'Using the generated card'
})[props.imageSource])
</script>

<template>
  <div class="d-grid gap-3">
    <!-- Search -->
    <div class="d-grid gap-2">
      <div class="d-flex justify-content-between align-items-center gap-2">
        <p class="fs-3xs fw-600 mb-0">
          Search preview
        </p>
        <p
          v-if="seo.noindex"
          class="fs-3xs text-warning mb-0"
        >
          Hidden from search results
        </p>
      </div>
      <div
        class="seo-preview seo-preview-search"
        :class="{ 'is-hidden': seo.noindex }"
      >
        <div class="seo-preview-site">
          <span class="seo-preview-favicon">
            <img
              :src="faviconUrl"
              alt=""
              width="18"
              height="18"
            >
          </span>
          <span class="seo-preview-site-text">
            <span class="seo-preview-site-name">{{ siteName }}</span>
            <span class="seo-preview-url">{{ breadcrumb }}</span>
          </span>
        </div>
        <p class="seo-preview-title">
          {{ clipText(seo.title, SEO_TITLE_MAX) }}
        </p>
        <p
          class="seo-preview-description"
          :class="{ 'is-empty': !seo.description }"
        >
          {{ seo.description ? clipText(seo.description, SEO_DESCRIPTION_MAX) : 'Google picks a snippet from the page when there is no description' }}
        </p>
      </div>
    </div>

    <!-- Social -->
    <div class="d-grid gap-2">
      <div class="d-flex justify-content-between align-items-center gap-2">
        <p class="fs-3xs fw-600 mb-0">
          Social preview
        </p>
        <p class="fs-3xs text-muted mb-0">
          {{ imageSourceLabel }}
        </p>
      </div>
      <div class="seo-preview seo-preview-social">
        <img
          v-if="seo.image"
          :src="seo.image"
          :alt="seo.imageAlt"
          class="seo-preview-social-image"
        >
        <div
          v-else
          class="seo-preview-social-image seo-preview-social-generated"
          :style="{ '--_seo-generated-color': color || defaultColor }"
        >
          <span>{{ seo.title }}</span>
        </div>
        <div class="seo-preview-social-body">
          <span class="seo-preview-social-domain">{{ socialDomain }}</span>
          <span class="seo-preview-social-title">{{ seo.title }}</span>
          <span
            v-if="seo.description"
            class="seo-preview-social-description"
          >{{ seo.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
