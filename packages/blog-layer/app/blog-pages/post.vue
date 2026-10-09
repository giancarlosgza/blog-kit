<script setup lang="ts">
import { NuxtLink } from '#components'

/** Head */
const route = useRoute()
const siteUrl = useSiteUrl()
const { basePath, blogPath, blogUrl } = useBlogPath()
definePageMeta({
  pageTitle: 'Article'
})

/** Composables */
const { normalizeDateValue, formatDateValue } = useDateValue()
const { brand } = useBlogBrand()

/** Constants */
const slug = computed(() => route.params.slug?.toString() || '')

useState<string | null>('activePost', () => null).value = slug.value

/** Fetch */
const { data, error, ready } = useBlogPost(slug.value)
await ready

if (!data.value)
  throw resourceError(error.value, 'Post not found')

/** Computed */
const post = computed(() => data.value?.post ?? null)
const author = computed(() => data.value?.author ?? null)
const title = computed(() => post.value?.title || 'Article')
const contents = computed(() => data.value?.contents ?? '')
const headings = computed(() => data.value?.headings ?? [])
const readingTime = computed(() => data.value?.readingTime)
const authorName = computed(() =>
  author.value?.name || (post.value ? resolveAuthorName(post.value, brand.defaultAuthor) : brand.defaultAuthor)
)
const publishedLabel = computed(() => formatDateValue(post.value?.createdAt))
const tags = computed(() => post.value?.tags ?? [])
const color = computed(() => post.value?.color || '')
const relatedPosts = computed(() => data.value?.related ?? [])
const olderPost = computed(() => data.value?.older ?? null)
const newerPost = computed(() => data.value?.newer ?? null)
const series = computed(() => data.value?.series ?? null)

/** SEO */
const authorUrl = computed(() => (author.value?.slug ? blogUrl(`/authors/${author.value.slug}`) : ''))
const publishedTime = computed(() => {
  const published = normalizeDateValue(post.value?.createdAt)
  return published ? new Date(published).toISOString() : undefined
})
const modifiedTime = computed(() => {
  const modified = normalizeDateValue(post.value?.updatedAt || post.value?.createdAt)
  return modified ? new Date(modified).toISOString() : undefined
})
const seoSource = computed(() => ({ ...(post.value ?? { title: '' }), slug: slug.value }))
const seoOptions = computed(() => ({ siteUrl, basePath, bodyExcerpt: data.value?.excerpt ?? '' }))
const baseSeo = computed(() => resolvePostSeo(seoSource.value, seoOptions.value))
const needsGeneratedImage = !post.value?.ogImageURL && !post.value?.imageURL
const ogImages = needsGeneratedImage
  ? defineOgImage('BlogPost', {
      kind: 'Article',
      title: computed(() => baseSeo.value.title),
      description: computed(() => baseSeo.value.description),
      author: computed(() => authorName.value),
      date: computed(() => publishedLabel.value),
      accentColor: computed(() => color.value)
    }, {
      alt: computed(() => `${baseSeo.value.title}. ${baseSeo.value.description}`)
    })
  : []
const seo = computed(() => resolvePostSeo(seoSource.value, { ...seoOptions.value, generatedImage: ogImages[0] }))
const seoTitle = computed(() => seo.value.title)
const description = computed(() => seo.value.description || `${brand.shortName} article.`)
const socialImage = computed(() => seo.value.image || `${siteUrl}/pwa-512x512.png`)
const canonicalUrl = computed(() => seo.value.canonical)

const jsonLd = computed(() => {
  if (!post.value)
    return null

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': seoTitle.value,
    'description': description.value,
    'image': socialImage.value,
    'datePublished': publishedTime.value,
    'dateModified': modifiedTime.value,
    'author': {
      '@type': 'Person',
      'name': authorName.value,
      ...(authorUrl.value ? { url: authorUrl.value } : {})
    },
    'publisher': { '@id': `${siteUrl}/#organization` },
    'url': canonicalUrl.value,
    'mainEntityOfPage': { '@type': 'WebPage', '@id': canonicalUrl.value },
    ...(series.value
      ? { isPartOf: { '@type': 'CreativeWorkSeries', 'name': series.value.name, 'url': blogUrl(`/series/${encodeURIComponent(series.value.slug)}`) } }
      : {})
  }
})

useHead(() => ({
  link: [{ rel: 'canonical' as const, href: canonicalUrl.value }],
  script: [
    ...(jsonLd.value ? [{ type: 'application/ld+json' as const, innerHTML: JSON.stringify(jsonLd.value) }] : [])
  ]
}))
useSeoMeta({
  title: () => seoTitle.value,
  description: () => description.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => description.value,
  ogUrl: canonicalUrl,
  ogSiteName: brand.name,
  ogType: 'article',
  ogImage: () => socialImage.value,
  ogImageAlt: () => seo.value.imageAlt,
  articlePublishedTime: () => publishedTime.value,
  articleModifiedTime: () => modifiedTime.value,
  articleAuthor: () => [authorUrl.value || authorName.value],
  articleTag: () => tags.value,
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => description.value,
  twitterImage: () => socialImage.value,
  twitterImageAlt: () => seo.value.imageAlt,
  twitterCard: 'summary_large_image',
  robots: () => seo.value.robots
})
</script>

<template>
  <div class="container my-5">
    <!-- Breadcrumb -->
    <div class="post-article-grid mb-4">
      <UiBreadcrumb
        :as="NuxtLink"
        :base-url="siteUrl"
        separator-icon="&#xe5cc;"
        :items="[
          { label: 'Home', to: blogPath() },
          { label: title },
        ]"
      />
    </div>

    <!-- Article -->
    <BlogPostArticle
      v-if="post"
      :post="post"
      :author="author"
      :contents="contents"
      :headings="headings"
      :reading-time="readingTime"
      :related="relatedPosts"
      :older="olderPost"
      :newer="newerPost"
      :series="series"
    />

    <div
      class="gradient-blob"
      :style="{ '--color': color }"
      aria-hidden="true"
    />
  </div>
</template>
