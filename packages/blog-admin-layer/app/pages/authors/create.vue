<script setup lang="ts">
import type { UiAlertToast } from '@colorffy/ui'
import type { IAuthor } from '#admin/shared/models/author'
import { useToast } from '@colorffy/ui'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

/** Head */
const runtimeConfig = useRuntimeConfig()
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined

definePageMeta({
  pageTransition: {
    name: 'slide-start',
    mode: 'out-in'
  },
  pageTitle: 'Authors',
  backRoute: '/authors',
  middleware: ['auth']
})
useSeoMeta({
  title: 'Create Author',
  description: 'Add a new author profile.',
  ogTitle: 'Create Author',
  ogDescription: 'Add a new author profile.',
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Create Author',
  twitterDescription: 'Add a new author profile.',
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
const form = ref<IAuthor>({
  name: '',
  slug: '',
  photoURL: '',
  description: '',
  profileLink: ''
})

/** Composables */
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)

/** Computed */
const trimmedName = computed(() => form.value.name.trim())

/** Methods */
async function onSaveForm() {
  if (!trimmedName.value || isLoading.value)
    return

  isLoading.value = true
  error.value = null

  try {
    const payload: IAuthor = {
      name: trimmedName.value,
      slug: form.value.slug?.trim() || toSlug(form.value.name),
      photoURL: form.value.photoURL?.trim() || '',
      description: form.value.description?.trim() || '',
      profileLink: form.value.profileLink?.trim() || ''
    }
    await addDoc(collection(db, 'authors'), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    onToastMessage('success', 'Author saved successfully')
    setTimeout(() => {
      navigateTo({ path: '/authors', query: { status: 'success' } })
    }, 1000)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create author'
    error.value = new Error(message)
    console.log('Failed to create author:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="container">
    <!-- Header -->
    <UiHeaderContent
      title="Create author"
      subtitle="Add a new author profile"
      back-button back-button-label="Go back"
      view-transition-name="selected-headline"
      @back="navigateTo({ name: 'authors' })"
    >
      <template #actions>
        <UiButton
          type="submit"
          form="author-form"
          variant="filled"
          text="Save author"
          :loading="isLoading"
          :disabled="!trimmedName"
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
        id="author-form"
        action="#"
        @submit.prevent="onSaveForm"
      >
        <AppAuthorsForm v-model:form="form" />
      </form>
    </div>

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </div>
</template>
