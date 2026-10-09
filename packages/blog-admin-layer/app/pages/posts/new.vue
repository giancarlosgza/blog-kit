<script setup lang="ts">
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'

/** Head */
const runtimeConfig = useRuntimeConfig()
const { blogName, defaultColor } = useAppConfig().admin
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined

definePageMeta({
  pageTransition: {
    name: 'slide-start',
    mode: 'out-in'
  },
  pageTitle: 'Posts',
  backRoute: '/posts',
  middleware: ['auth']
})
useSeoMeta({
  title: 'Create Post',
  description: `Create a new ${blogName} post.`,
  ogTitle: 'Create Post',
  ogDescription: `Create a new ${blogName} post.`,
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Create Post',
  twitterDescription: `Create a new ${blogName} post.`,
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
const db = useFirestore()
const error = ref<Error | null>(null)
const isLoading = ref<boolean>(false)
/** Prefill from AI plan */
const prefillTitle = typeof route.query.title === 'string' ? route.query.title.trim() : ''
const form = ref({
  title: prefillTitle,
  slug: toSlug(prefillTitle),
  color: defaultColor
})

/** Watch */
watch(() => form.value.title, (value) => {
  form.value.slug = toSlug(value)
})

/** Methods */
async function onSaveForm() {
  if (isLoading.value)
    return

  error.value = null
  const id = toSlug(form.value.slug)
  if (!id) {
    error.value = new Error('A slug is required.')
    return
  }

  isLoading.value = true
  try {
    const postRef = doc(db, 'posts', id)
    const existing = await getDoc(postRef)
    if (existing.exists()) {
      error.value = new Error('A post with this slug already exists.')
      return
    }

    const now = Timestamp.now()
    await setDoc(postRef, {
      title: form.value.title || id,
      color: form.value.color,
      isPublished: false,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    })
    await navigateTo(`/posts/${id}`)
  } catch (err: unknown) {
    error.value = new Error(err instanceof Error ? err.message : 'Failed to create post.')
    console.log('Failed to create post:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="container">
    <!-- Header -->
    <UiHeaderContent
      title="Create post"
      subtitle="Pick a title and slug to start writing"
      back-button back-button-label="Go back"
      view-transition-name="selected-headline"
      @back="navigateTo('/posts')"
    >
      <template #actions>
        <UiButton
          type="submit"
          form="post-form"
          variant="filled"
          text="Create post"
          :loading="isLoading"
          :disabled="!form.slug"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xeb60;" />
          </template>
        </UiButton>
      </template>
    </UiHeaderContent>

    <div class="d-grid gap-3 mb-3">
      <!-- Error -->
      <UiAlert
        v-if="error"
        type="tonal"
        variant="danger"
        size="sm"
        :message="`${error}`"
      />

      <!-- Form -->
      <form
        id="post-form"
        action="#"
        @submit.prevent="onSaveForm"
      >
        <AppPostsCreateForm v-model:form="form" />
      </form>
    </div>
  </div>
</template>
