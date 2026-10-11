<script setup lang="ts">
import { signOut } from 'firebase/auth'

/** Interfaces */
interface IError {
  statusCode?: number | undefined
  statusMessage?: string | undefined
  message?: string | undefined
}

/** Head */
const route = useRoute()
const siteUrl = useAdminSiteUrl()
const canonicalUrl = computed(() => siteUrl ? `${siteUrl}${route.path}` : route.path)

definePageMeta({
  layout: 'auth',
  pageTitle: 'Forbidden'
})
useSeoMeta({
  title: 'Forbidden',
  description: 'You don\'t have permission to access this page or resource.',
  ogTitle: 'Forbidden',
  ogDescription: 'You don\'t have permission to access this page or resource.',
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary'
})
useHead({ link: [{ rel: 'canonical', href: canonicalUrl }] })

/** Composables */
const auth = useFirebaseAuth()!

/** Data */
const msg: IError = {
  statusCode: 403,
  statusMessage: 'Forbidden',
  message: 'You don\'t have permission to access this page or resource.'
}
const error = ref<Error | null>(null)
const isSigningOut = ref<boolean>(false)

/** Computed */
const fromPath = computed<string | null>(() => {
  const value = route.query?.from
  return typeof value === 'string' && value.length > 0 ? value : null
})

/** Methods */
async function onSignOut(): Promise<void> {
  if (!auth) {
    return
  }
  try {
    isSigningOut.value = true
    await signOut(auth)
    await navigateTo('/auth/login')
  } catch (err: any) {
    console.log('403 sign out error:', err)
    error.value = err
  } finally {
    isSigningOut.value = false
  }
}
</script>

<template>
  <div>
    <div class="d-flex flex-column justify-content-center dvh-100">
      <div class="container">
        <div class="row justify-content-center">
          <div
            class="col-md-12 text-center"
            role="region"
            aria-labelledby="forbidden-title"
          >
            <div class="mb-3">
              <UiIconMaterial class="iw-bold text-danger fs-5xl" icon-code="&#xe897;" />
            </div>
            <div class="mb-4">
              <h1 id="forbidden-title" class="fs-5xl fw-800">
                {{ msg.statusCode }}
              </h1>
              <h2 class="fw-800">
                {{ msg.statusMessage }}
              </h2>
              <h3 class="fs-lg fw-400 text-muted mb-3">
                {{ msg.message }}
              </h3>
              <p
                v-if="fromPath"
                class="subtitle-2 text-danger"
              >
                URL: {{ fromPath }}
              </p>
            </div>

            <UiAlert
              v-if="error"
              type="tonal"
              variant="danger"
              size="sm"
              class="mb-3"
              :message="error?.message || 'An unexpected error occurred.'"
            />

            <UiButtonGroup class="justify-content-center">
              <UiButton
                variant="tonal"
                color="danger"
                text="Sign out"
                size="lg" class="btn-cta"
                :disabled="isSigningOut"
                @click="onSignOut"
              >
                <template #icon>
                  <UiIconMaterial icon-code="&#xe9ba;" />
                </template>
              </UiButton>
            </UiButtonGroup>
          </div>
        </div>
      </div>
    </div>

    <IncludeBackgroundGradients />
  </div>
</template>
