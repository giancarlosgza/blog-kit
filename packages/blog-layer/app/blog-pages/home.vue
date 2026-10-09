<script setup lang="ts">
import type { IChipOption } from '@colorffy/ui'

/** Head */
const { blogPath, blogUrl } = useBlogPath()
definePageMeta({
  pageTitle: 'Blog'
})

/** Composables */
const { brand, blogName, blogDescription } = useBlogBrand()
const {
  tags,
  pending,
  selectedTag,
  hasMore,
  featuredPost,
  secondaryFeaturedPosts,
  gridPosts,
  loadMore,
  error: feedError,
  ready
} = usePostFeed()
await ready

if (import.meta.server && feedError.value)
  throw createError({ statusCode: 503, statusMessage: 'Temporarily unavailable' })

/** Constants */
const pageTitle = brand.home.title
const ogTitle = `${brand.name} | ${pageTitle}`

const ogDescription = brand.home.ogDescription || brand.description

/** Computed */
const seoTitle = blogName
const seoDescription = blogDescription
const tagOptions = computed((): IChipOption[] =>
  (tags.value ?? []).map(tag => ({ id: tag.name, text: tag.name }))
)
const articlesHeading = computed(() => (selectedTag.value ? `Tagged ${selectedTag.value}` : 'Latest articles'))

/** Methods */
function onTagFilter(value: string | string[] | null): void {
  const tag = Array.isArray(value) ? value[0] : value
  selectedTag.value = tag || null
}

/** SEO & Structured Data */
defineOgImage('BlogPost', {
  kind: 'Blog',
  title: brand.name,
  description: ogDescription
}, {
  alt: [brand.name, ogDescription].filter(Boolean).join('. ')
})

useHead(() => ({
  link: [{ rel: 'canonical', href: blogUrl() }]
}))
useSeoMeta({
  title: pageTitle,
  description: () => seoDescription.value,
  ogTitle,
  ogDescription: () => seoDescription.value,
  ogUrl: blogUrl(),
  ogSiteName: brand.name,
  ogType: 'website',
  twitterTitle: ogTitle,
  twitterDescription: () => seoDescription.value,
  twitterCard: 'summary_large_image',
  robots: () => (selectedTag.value ? 'noindex, follow' : 'index, follow')
})
</script>

<template>
  <div class="container my-5">
    <!-- Header -->
    <header class="section-hero text-center">
      <p
        v-if="brand.home.eyebrow"
        class="fs-xs fw-500 text-uppercase text-muted mb-3"
      >
        {{ brand.home.eyebrow }}
      </p>
      <h1 class="display-1 mb-0">
        {{ seoTitle }}
        <span v-if="brand.home.headingAccent">
          {{ brand.home.headingAccent }}
        </span>
      </h1>
      <p class="section-hero-lead subtitle-1 lh-md text-muted mt-4 mb-0">
        {{ seoDescription }}
      </p>
    </header>

    <!-- Featured -->
    <section
      v-if="featuredPost"
      class="d-grid gap-5 mt-section mt-section-xl"
      :aria-label="secondaryFeaturedPosts.length ? 'Featured articles' : 'Featured article'"
    >
      <BlogPostCard
        :post="featuredPost"
        featured
      />
      <div
        v-if="secondaryFeaturedPosts.length"
        class="blog-post-grid d-grid grid-repeat-cols-1 grid-repeat-cols-md-2 gap-inline-8 gap-block-10"
      >
        <BlogPostCard
          v-for="post in secondaryFeaturedPosts"
          :key="post.id"
          :post="post"
          badge="Featured"
          badge-icon="&#xf525;"
        />
      </div>
    </section>

    <!-- Articles -->
    <section
      class="mt-section mt-section-xl"
      aria-labelledby="home-articles-heading"
    >
      <div class="d-grid gap-3 mb-4">
        <UiHeaderContent
          id="home-articles-heading"
          as="h2"
          size="lg"
          class="mb-0"
          :title="articlesHeading"
        />
        <UiChipGroup
          v-if="tagOptions.length"
          variant="outline"
          color="secondary"
          :options="tagOptions"
          :model-value="selectedTag"
          aria-label="Filter articles by tag"
          custom-class="post-filter-chips"
          @update:model-value="onTagFilter"
        />
      </div>

      <BlogPostList
        :posts="gridPosts"
        :pending="pending"
        :has-more="hasMore"
        :next-href="selectedTag ? undefined : blogPath('/page/2')"
        paginated
        heading-tag="h3"
        :empty-title="selectedTag ? `No articles tagged “${selectedTag}” yet` : 'No articles published yet'"
        :empty-subtitle="selectedTag ? 'Try another tag or browse every article.' : 'Check back soon for new articles.'"
        @load-more="loadMore"
      >
        <template
          v-if="selectedTag"
          #empty-action
        >
          <UiButtonGroup class="justify-content-center">
            <UiButton
              variant="tonal"
              color="primary"
              text="Show all articles"
              class="btn-cta"
              @click="selectedTag = null"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5c4;" />
              </template>
            </UiButton>
          </UiButtonGroup>
        </template>
      </BlogPostList>
    </section>
  </div>
</template>
