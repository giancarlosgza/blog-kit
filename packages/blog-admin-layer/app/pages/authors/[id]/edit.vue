<script setup lang="ts">
import type { UiAlertToast } from '@colorffy/ui'
import type { IAuthor } from '#admin/shared/models/author'
import { useToast } from '@colorffy/ui'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

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
  title: 'Edit Author',
  description: 'Edit an author profile.',
  ogTitle: 'Edit Author',
  ogDescription: 'Edit an author profile.',
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Edit Author',
  twitterDescription: 'Edit an author profile.',
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
const paramsId = route.params.id
if (typeof paramsId !== 'string' || !paramsId) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}
const db = useFirestore()
const error = ref<Error | null>(null)
const isLoading = ref<boolean>(false)
const isFetching = ref<boolean>(true)
const author = ref<IAuthor | null>(null)
const form = ref<IAuthor>({
  uid: paramsId,
  name: '',
  slug: '',
  photoURL: '',
  description: '',
  profileLink: ''
})

/** Composables */
const { blogUrl } = useBlogUrl()
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)

/** Computed */
const trimmedName = computed(() => form.value.name.trim())

/** Lifecycle */
onMounted(async () => {
  try {
    const snap = await getDoc(doc(db, 'authors', paramsId))
    if (!snap.exists()) {
      return
    }
    const data = snap.data() as IAuthor
    author.value = { ...data, id: snap.id }
    form.value = {
      uid: snap.id,
      name: data.name ?? '',
      slug: data.slug ?? '',
      photoURL: data.photoURL ?? '',
      description: data.description ?? '',
      profileLink: data.profileLink ?? ''
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err : new Error('Failed to load author')
    console.log('Failed to load author:', err)
  } finally {
    isFetching.value = false
  }
})

/** Methods */
async function onUpdateForm() {
  if (!author.value || !form.value.uid) {
    onToastMessage('warning', 'Invalid author selected')
    return
  }
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
    await setDoc(doc(db, 'authors', form.value.uid), {
      ...payload,
      updatedAt: serverTimestamp()
    }, { merge: true })

    onToastMessage('success', 'Author updated successfully')
    setTimeout(() => {
      navigateTo({ path: '/authors', query: { status: 'success' } })
    }, 1000)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update author'
    error.value = new Error(message)
    console.log('Failed to update author:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="container">
    <!-- Header -->
    <UiHeaderContent
      title="Edit author"
      :subtitle="`Edit the ${author?.name || 'author'} profile`"
      back-button back-button-label="Go back"
      view-transition-name="selected-headline"
      @back="navigateTo({ name: 'authors' })"
    >
      <template #actions>
        <UiButtonGroup>
          <UiButton
            v-if="author?.slug"
            variant="text"
            icon
            title="View live"
            aria-label="View live"
            :href="`${blogUrl}/authors/${author.slug}`"
            target="_blank"
            rel="noopener"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe89e;" />
            </template>
          </UiButton>
          <UiButton
            type="submit"
            form="author-form"
            variant="filled"
            text="Save changes"
            :loading="isLoading"
            :disabled="!author || !trimmedName"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xeb60;" />
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
      class="mb-3"
    />

    <!-- Loading -->
    <div
      v-if="isFetching"
      class="author-editor d-grid gap-3"
      role="status"
      aria-label="Loading author"
    >
      <div class="d-grid gap-3">
        <div class="skeleton skeleton-lg" />
        <div class="skeleton skeleton-lg" />
      </div>
      <div class="skeleton skeleton-thumbnail" />
    </div>

    <!-- Form -->
    <div
      v-else-if="author"
      class="d-grid gap-3 mb-3"
    >
      <form
        id="author-form"
        action="#"
        @submit.prevent="onUpdateForm"
      >
        <AppAuthorsForm
          v-model:form="form"
          is-editing
        />
      </form>
    </div>

    <!-- Not found -->
    <UiEmpty
      v-else
      title="Author not found"
      subtitle="It may have been deleted or the link is wrong"
      use-custom-icon
      icon-code="&#xe7ef;"
    />

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </div>
</template>
