<script setup lang="ts">
import type { IPostListResponse } from '#blog/shared/types/api'
import { NuxtLink } from '#components'

/** Head */
const route = useRoute()
const { blogPath, blogUrl } = useBlogPath()

// Page 1 is the blog home
const raw = computed(() => route.params.page?.toString() || '')
const page = computed(() => (/^\d+$/.test(raw.value) ? Number.parseInt(raw.value, 10) : Number.NaN))

if (Number.isNaN(page.value) || page.value < 1)
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
if (page.value === 1)
  await navigateTo(blogPath(), { redirectCode: 301 })

/** Composables */
const { brand } = useBlogBrand()
const { t } = useBlogLabels()
const { data, pending, error, ready } = useCachedResource<IPostListResponse>(
  `posts-page-${page.value}`,
  () => $fetch<IPostListResponse>('/api/blog/posts', { query: { page: page.value } })
)
await ready

// Pages past the last one are 404s
if (page.value >= 2 && !data.value?.posts.length)
  throw resourceError(data.value ? null : error.value, t('pageNotFound'))

const posts = computed(() => data.value?.posts ?? [])
const hasNext = computed(() => data.value?.hasMore ?? false)

/** Links */
const prevPath = computed(() => blogPath(page.value <= 2 ? '/' : `/page/${page.value - 1}`))
const nextPath = computed(() => blogPath(`/page/${page.value + 1}`))
const pageUrl = computed(() => blogUrl(`/page/${page.value}`))
const prevUrl = computed(() => blogUrl(page.value <= 2 ? '/' : `/page/${page.value - 1}`))

/** SEO */
const seoTitle = computed(() => t('archiveTitle', { page: page.value }))
const seoDescription = computed(() => t('archivePageSuffix', { description: brand.archive.description || t('archiveDescription', { blog: brand.shortName }), page: page.value }))

defineOgImage('BlogPost', {
  kind: t('blog'),
  title: t('allArticles'),
  description: computed(() => seoDescription.value)
}, {
  alt: computed(() => `${seoTitle.value}. ${seoDescription.value}`)
})

useHead(() => ({
  link: [
    { rel: 'canonical' as const, href: pageUrl.value },
    { rel: 'prev' as const, href: prevUrl.value },
    ...(hasNext.value ? [{ rel: 'next' as const, href: blogUrl(`/page/${page.value + 1}`) }] : [])
  ]
}))
useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogUrl: pageUrl,
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
      :title="t('allArticles')"
      title-id="archive-heading"
      :description="t('pageNumber', { page })"
      :breadcrumbs="[
        { label: t('home'), to: blogPath() },
        { label: `Page ${page}` },
      ]"
    />

    <!-- Grid -->
    <section
      class="mt-section mt-section-md"
      aria-labelledby="archive-heading"
    >
      <BlogPostList
        :posts="posts"
        :pending="pending"
        :empty-title="t('noArticlesOnPage')"
      />
    </section>

    <!-- Pagination -->
    <nav
      class="d-flex justify-content-between align-items-center gap-3 mt-8"
      :aria-label="t('pagination')"
    >
      <UiButton
        :as="NuxtLink"
        :to="prevPath"
        rel="prev"
        variant="tonal"
        color="neutral"
        :text="t('newerArticles')"
        class="btn-cta"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5c4;" />
        </template>
      </UiButton>
      <UiButton
        v-if="hasNext"
        :as="NuxtLink"
        :to="nextPath"
        rel="next"
        variant="tonal"
        color="primary"
        :text="t('olderArticles')"
        class="btn-cta"
        icon-trailing
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5c8;" />
        </template>
      </UiButton>
    </nav>
  </div>
</template>
