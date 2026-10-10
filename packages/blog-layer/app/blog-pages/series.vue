<script setup lang="ts">
import type { ISeriesPageResponse } from '#blog/shared/types/api'
import { NuxtLink } from '#components'

/** Head */
const route = useRoute()
const { blogPath, blogUrl } = useBlogPath()

/** Constants */
const slug = computed(() => route.params.slug?.toString() || '')

/** Composables */
const { brand } = useBlogBrand()
const { t } = useBlogLabels()

/** Fetch */
const { data, error, ready } = useCachedResource<ISeriesPageResponse>(
  `blog-series-${slug.value}`,
  () => $fetch<ISeriesPageResponse>(`/api/blog/series/${encodeURIComponent(slug.value)}`)
)
await ready

if (!data.value)
  throw resourceError(error.value, t('seriesNotFound'))

/** Computed */
const posts = computed(() => data.value?.posts ?? [])
const seriesName = computed(() => data.value?.series.name || t('series'))
const partsLabel = computed(() => `${posts.value.length} ${posts.value.length === 1 ? 'part' : 'parts'}`)

/** SEO */
const seoTitle = computed(() => `${seriesName.value} series`)
const seoDescription = computed(() =>
  data.value?.series.description || `Read the ${seriesName.value} series on the ${brand.shortName}, ${partsLabel.value} in order.`

)
const canonicalUrl = computed(() => blogUrl(`/series/${encodeURIComponent(slug.value)}`))
defineOgImage('BlogPost', {
  kind: t('series'),
  title: computed(() => seriesName.value),
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
  robots: () => (posts.value.length ? 'index,follow' : 'noindex,follow')
})
</script>

<template>
  <div class="container my-5">
    <!-- Header -->
    <LayoutHubHeader
      :title="seriesName"
      title-id="series-heading"
      :description="data?.series.description"
      :breadcrumbs="[
        { label: t('home'), to: blogPath() },
        { label: t('series') },
        { label: seriesName },
      ]"
    >
      <p class="caption font-code text-uppercase text-muted mt-4 mb-0">
        Series · {{ partsLabel }}
      </p>
    </LayoutHubHeader>

    <!-- Parts -->
    <section
      class="mt-section mt-section-md"
      aria-labelledby="series-heading"
    >
      <div
        v-if="posts.length"
        class="blog-post-grid d-grid grid-repeat-cols-1 grid-repeat-cols-md-2 grid-repeat-cols-xl-3 gap-inline-8 gap-block-10"
      >
        <BlogPostCard
          v-for="(post, index) in posts"
          :key="post.id"
          :post="post"
          :badge="`Part ${index + 1}`"
          :show-series="false"
        />
      </div>

      <UiEmpty
        v-else
        :title="t('noPartsYet')"
        :subtitle="t('firstPartSoon')"
        custom-class="my-5 my-md-8"
      >
        <template #action>
          <UiButtonGroup class="justify-content-center">
            <UiButton
              :as="NuxtLink"
              :to="blogPath()"
              variant="tonal"
              color="primary"
              :text="t('backToHome')"
              class="btn-cta"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5c4;" />
              </template>
            </UiButton>
          </UiButtonGroup>
        </template>
      </UiEmpty>
    </section>
  </div>
</template>
