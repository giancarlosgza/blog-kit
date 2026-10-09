<script setup lang="ts">
import type { IAuthor } from '#admin/shared/models/author'

/** Head */
const runtimeConfig = useRuntimeConfig()
const { blogName } = useAppConfig().admin
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined

definePageMeta({
  pageTitle: 'Authors',
  middleware: ['auth']
})
useSeoMeta({
  title: 'Authors',
  description: `Manage ${blogName} authors.`,
  ogTitle: 'Authors',
  ogDescription: `Manage ${blogName} authors.`,
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Authors',
  twitterDescription: `Manage ${blogName} authors.`,
  twitterCard: 'summary'
})
useHead({
  link: [
    {
      rel: 'canonical',
      href: siteUrl ? `${siteUrl}${route.path}` : route.path
    }
  ]
})

/** Data */
const {
  documents: authors,
  error,
  isLoading,
  isLoadingMore,
  hasMoreDocs,
  hasNotDocs,
  fetchDocs: fetchAuthors,
  loadMoreDocs
} = useFirebaseCollection<IAuthor>({
  collectionPath: 'authors',
  docsLimit: 20,
  orderByField: null
})

/** Lifecycle */
onMounted(() => fetchAuthors())
</script>

<template>
  <div class="container-fluid mb-5">
    <!-- Header -->
    <UiHeaderContent
      title="Authors"
      subtitle="Manage author profiles, avatars and bios"
      view-transition-name="selected-headline"
      hide-actions-when-narrow
    >
      <template #actions>
        <UiButtonGroup connected>
          <UiButton
            variant="filled"
            text="Create author"
            @click="navigateTo({ name: 'authors-create' })"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe145;" />
            </template>
          </UiButton>
        </UiButtonGroup>
      </template>
    </UiHeaderContent>

    <!-- Error -->
    <UiAlert
      v-if="error"
      type="tonal"
      variant="danger"
      size="sm"
      :message="`${error}`"
      class="mb-1"
    />

    <!-- Layouts -->
    <UiCard
      v-if="authors"
      variant="pane"
    >
      <template #body>
        <AppAuthorsTable
          :authors="authors"
          :is-loading="isLoading"
        />
      </template>
    </UiCard>

    <!-- Load more -->
    <div class="d-grid grid-repeat-cols-1 align-items-center gap-3 mt-section mt-section-md">
      <div class="text-decoration-side-lines">
        <UiButton
          v-if="!hasNotDocs"
          variant="outline"
          class="hover-rotate"
          :text="!hasMoreDocs ? 'No more authors' : 'Show more'"
          aria-label="Show more authors"
          :aria-busy="isLoadingMore"
          :disabled="!hasMoreDocs || isLoadingMore"
          @click="loadMoreDocs"
        >
          <template #icon>
            <UiIconMaterial :icon-code="!hasMoreDocs ? '&#xea76;' : '&#xe863;'" />
          </template>
        </UiButton>
      </div>
      <div class="justify-items-md-end">
        <p class="subtitle-2 text-muted mb-0">
          Showing {{ authors?.length }} authors
        </p>
      </div>
    </div>

    <!-- FAB -->
    <div class="fab-group">
      <UiButton
        variant="gradient"
        custom-class="btn-fab fab-mobile"
        aria-label="Create author"
        @click="navigateTo({ name: 'authors-create' })"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe145;" />
        </template>
      </UiButton>
    </div>
  </div>
</template>
