<script setup lang="ts">
import type { UiAlertToast } from '@colorffy/ui'
import type { ISettings } from '@giancarlosgza/blog-core'
import { useToast } from '@colorffy/ui'

/** Head */
const runtimeConfig = useRuntimeConfig()
const { blogName, defaultColor } = useAppConfig().admin
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined

definePageMeta({
  pageTitle: 'Settings',
  roles: ['admin'],
  middleware: ['auth']
})
useSeoMeta({
  title: 'Settings',
  description: `Configure the ${blogName}.`,
  ogTitle: 'Settings',
  ogDescription: `Configure the ${blogName}.`,
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Settings',
  twitterDescription: `Configure the ${blogName}.`,
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
const error = ref<Error | null>(null)
const isFetching = ref<boolean>(true)
const form = ref<ISettings>({
  blogName: '',
  blogDescription: '',
  blogKeywords: '',
  blogURL: '',
  logoURL: '',
  primaryColor: defaultColor,
  backgroundColor: '#ffffff'
})

/** Composables */
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)
const {
  settings,
  isSaving,
  loadSettings,
  saveSettings
} = useBlogSettings()

/** Computed */
const isFormValid = computed(() => Boolean(
  form.value.blogName?.trim()
  && form.value.blogDescription?.trim()
  && form.value.blogKeywords?.trim()
  && form.value.blogURL?.trim()
))

/** Lifecycle */
onMounted(async () => {
  try {
    await loadSettings()
    if (settings.value)
      form.value = { ...form.value, ...settings.value }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err : new Error('Failed to load settings')
    console.log('Failed to load settings:', err)
  } finally {
    isFetching.value = false
  }
})

/** Methods */
async function onSaveForm() {
  if (!isFormValid.value || isSaving.value)
    return

  error.value = null

  try {
    await saveSettings({ ...form.value })
    onToastMessage('success', 'Settings saved successfully')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save settings'
    error.value = new Error(message)
    console.log('Failed to save settings:', err)
  }
}
</script>

<template>
  <div class="container">
    <!-- Header -->
    <UiHeaderContent
      title="Settings"
      subtitle="Configure blog name, branding and colors"
      view-transition-name="selected-headline"
    >
      <template #actions>
        <UiButton
          type="submit"
          form="settings-form"
          variant="filled"
          text="Save settings"
          :loading="isSaving"
          :disabled="isFetching || !isFormValid"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xeb60;" />
          </template>
        </UiButton>
      </template>
    </UiHeaderContent>

    <!-- Loading -->
    <div
      v-if="isFetching"
      class="settings-editor d-grid gap-3"
      role="status"
      aria-label="Loading settings"
    >
      <div class="d-grid gap-3">
        <div class="skeleton skeleton-lg" />
        <div class="skeleton skeleton-lg" />
      </div>
      <div class="skeleton skeleton-thumbnail" />
    </div>

    <div
      v-else
      class="d-grid gap-3 mb-3"
    >
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
        id="settings-form"
        action="#"
        @submit.prevent="onSaveForm"
      >
        <AppSettingsForm v-model:form="form" />
      </form>
    </div>

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </div>
</template>
