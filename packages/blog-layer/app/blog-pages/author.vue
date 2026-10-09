<script setup lang="ts">
import type { IAuthor } from '@giancarlosgza/blog-core'
import type { IAuthorPageResponse } from '#blog/shared/types/api'

/** Head */
const route = useRoute()
const { blogPath, blogUrl } = useBlogPath()
definePageMeta({
  pageTitle: 'Author'
})

/** Constants */
const slug = computed(() => route.params.slug?.toString() || '')

/** Composables */
const { brand } = useBlogBrand()

/** Fetch */
const { data, posts, pending, hasMore, loadMore, error, ready } = usePaginatedPosts<IAuthorPageResponse>(
  `posts-author-${slug.value}`,
  `/api/blog/authors/${encodeURIComponent(slug.value)}`
)
await ready

if (!data.value)
  throw resourceError(error.value, 'Author not found')

const author = computed<IAuthor>(() => data.value?.author ?? { name: '' })

/** SEO */
const authorName = computed(() => author.value?.name || 'Author')
const seoDescription = computed(() => author.value?.description || `Articles by ${authorName.value} on ${brand.shortName}.`)
const canonicalUrl = computed(() => blogUrl(`/authors/${slug.value}`))

defineOgImage('BlogPost', {
  kind: 'Author',
  title: computed(() => authorName.value),
  description: computed(() => seoDescription.value)
}, {
  alt: computed(() => `${authorName.value}. ${seoDescription.value}`)
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }]
}))
useSeoMeta({
  title: () => authorName.value,
  description: () => seoDescription.value,
  ogTitle: () => authorName.value,
  ogDescription: () => seoDescription.value,
  ogUrl: canonicalUrl,
  ogSiteName: brand.name,
  ogType: 'profile',
  twitterTitle: () => authorName.value,
  twitterDescription: () => seoDescription.value,
  twitterCard: 'summary_large_image',
  robots: 'index,follow'
})
</script>

<template>
  <div class="container my-5">
    <!-- Header -->
    <LayoutHubHeader
      :title="authorName"
      title-id="author-heading"
      :description="author.description"
      :breadcrumbs="[
        { label: 'Home', to: blogPath() },
        { label: authorName },
      ]"
    >
      <!-- Author -->
      <div
        v-if="author.photoURL || author.profileLink"
        class="d-flex align-items-center gap-3 mt-4"
      >
        <UiAvatar
          v-if="author.photoURL"
          :src="author.photoURL"
          :alt="`${authorName} photo`"
          size="sm"
          mask-shape="cookie-12"
          mask-stretch
          class="flex-shrink-0"
        />
        <NuxtLink
          v-if="author.profileLink"
          :to="author.profileLink"
          target="_blank"
          rel="noopener noreferrer"
          :title="`${authorName} profile`"
          class="subtitle-1"
        >
          {{ author.username || authorName }}
        </NuxtLink>
      </div>
    </LayoutHubHeader>

    <!-- Grid -->
    <section
      class="mt-section mt-section-md"
      aria-labelledby="author-heading"
    >
      <BlogPostList
        :posts="posts"
        :pending="pending"
        paginated
        :has-more="hasMore"
        :empty-title="`No articles by ${authorName} yet`"
        @load-more="loadMore"
      />
    </section>
  </div>
</template>
