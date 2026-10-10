<script setup lang="ts">
import type { ITagPageResponse } from '#blog/shared/types/api'

/** Head */
const route = useRoute()
const { blogPath, blogUrl } = useBlogPath()

/** Constants */
const tag = computed(() => safeDecode(route.params.tag?.toString() || ''))

// Malformed escapes (e.g. a bare `%`) keep the raw value instead of a 500
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Composables */
const { brand } = useBlogBrand()
const { t } = useBlogLabels()

/** Fetch */
const { data, posts, pending, hasMore, loadMore, error, ready } = usePaginatedPosts<ITagPageResponse>(
  `posts-tag-${tag.value}`,
  `/api/blog/tags/${encodeURIComponent(tag.value)}`
)
await ready

if (!data.value)
  throw resourceError(error.value, t('tagNotFound'))

/** SEO */
const tagLabel = computed(() => `#${tag.value}`)
const seoTitle = computed(() => t('articlesTagged', { tag: tag.value }))
const seoDescription = computed(() => t('browseTagged', { blog: brand.shortName, tag: tag.value }))
const canonicalUrl = computed(() => blogUrl(`/tags/${encodeURIComponent(tag.value)}`))

defineOgImage('BlogPost', {
  kind: t('tag'),
  title: computed(() => tagLabel.value),
  description: computed(() => seoDescription.value)
}, {
  alt: computed(() => `${seoTitle.value}. ${seoDescription.value}`)
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }]
}))
useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogUrl: canonicalUrl,
  ogSiteName: brand.name,
  ogType: 'website',
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
  twitterCard: 'summary_large_image',
  robots: 'index,follow'
})
</script>

<template>
  <div class="container my-5">
    <!-- Header -->
    <LayoutHubHeader
      :title="tagLabel"
      title-id="tag-heading"
      :description="t('articlesTagged', { tag })"
      :breadcrumbs="[
        { label: t('home'), to: blogPath() },
        { label: tagLabel },
      ]"
    />

    <!-- Grid -->
    <section
      class="mt-section mt-section-md"
      aria-labelledby="tag-heading"
    >
      <BlogPostList
        :posts="posts"
        :pending="pending"
        paginated
        :has-more="hasMore"
        :empty-title="t('noArticlesTagged', { tag })"
        @load-more="loadMore"
      />
    </section>
  </div>
</template>
