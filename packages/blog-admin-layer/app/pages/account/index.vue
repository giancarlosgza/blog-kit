<script setup lang="ts">
import type { BrandIcon } from '#admin/app/utils/brand-icons'
import { getBrandIcon, getBrandIconClass } from '#admin/app/utils/brand-icons'

/** Interfaces */
interface IProviderInfo {
  providerId: string
  icon: BrandIcon | string
  name: string
  size: number
}

/** Head */
const route = useRoute()
const siteUrl = useAdminSiteUrl()

definePageMeta({
  pageTitle: 'Account',
  middleware: ['auth']
})
useSeoMeta({
  title: 'Account',
  description: 'Your account data details.',
  ogTitle: 'Account',
  ogDescription: 'Your account data details.',
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Account',
  twitterDescription: 'Your account data details.',
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

/** Composables */
const user = useCurrentUser()

/** Computed */
const userData = computed(() => ({
  displayName: user.value?.displayName || 'User',
  email: user.value?.email || '',
  photoURL: user.value?.photoURL || '/avatar.png'
}))
const providerInfo = computed((): IProviderInfo => {
  const providerId = user?.value?.providerData[0]?.providerId

  const providers: Record<string, IProviderInfo> = {
    'google.com': { providerId: 'google.com', icon: 'google', name: 'Google', size: 18 },
    'twitter.com': { providerId: 'twitter.com', icon: 'twitter', name: 'X (Twitter)', size: 20 },
    'github.com': { providerId: 'github.com', icon: 'github', name: 'GitHub', size: 20 },
    'apple.com': { providerId: 'apple.com', icon: 'apple', name: 'Apple', size: 20 }
  }

  return providers[providerId || ''] || {
    providerId: 'password',
    icon: '&#xec0a;',
    name: 'Email & Password',
    size: 16
  }
})
</script>

<template>
  <div class="container mb-5">
    <!-- Header -->
    <UiHeaderContent
      title="Account"
      subtitle="Your account data details"
      view-transition-name="selected-headline"
    />

    <!-- Content -->
    <div
      v-if="user"
      class="d-grid place-content-center text-center gap-6"
    >
      <div>
        <UiAvatar
          v-if="userData"
          :src="userData.photoURL"
          :alt="`${userData.displayName || 'User'} photo`"
          size="md"
          class="mx-0"
          mask-shape="cookie-12"
          mask-stretch
        />
      </div>
      <div class="flex-fill">
        <h2 class="fs-2xl fw-800">
          {{ userData.displayName }}
        </h2>
        <h3 class="fs-base font-secondary text-muted mb-0">
          {{ userData.email }}
        </h3>
      </div>
    </div>

    <!-- Content -->
    <div class="mt-section mt-section-lg">
      <UiSubheadingContent
        as="h2"
        title="Your information"
      />
      <div
        v-if="user"
        class="d-grid gap-3"
      >
        <!-- User details cards -->
        <UiCard variant="pane">
          <template #body>
            <div class="d-flex flex-column gap-5">
              <div>
                <p class="subtitle-2 text-muted mb-1">
                  Name
                </p>
                <p class="subtitle-1 fw-500 mb-0">
                  {{ userData.displayName || 'Not provided' }}
                </p>
              </div>
              <div>
                <p class="subtitle-2 text-muted mb-1">
                  Email
                </p>
                <p class="subtitle-1 fw-500 mb-0">
                  {{ userData.email || 'Not provided' }}
                </p>
              </div>
              <div>
                <p class="subtitle-2 text-muted mb-1">
                  Account ID
                </p>
                <p class="subtitle-1 fw-500 mb-0">
                  {{ user.uid || 'Not provided' }}
                </p>
              </div>
            </div>
          </template>
        </UiCard>

        <!-- User status cards -->
        <UiCard variant="pane">
          <template #body>
            <div class="d-flex justify-content-between flex-wrap gap-5">
              <div>
                <p class="subtitle-2 text-muted mb-1">
                  Email verified
                </p>
                <p class="subtitle-1 fw-500 mb-0">
                  <UiIconMaterial
                    :icon-code="user.emailVerified ? '&#xe86c;' : '&#xf023;'"
                    :class="user.emailVerified ? 'text-success iw-bold' : 'text-muted'"
                    class="fs-base me-1"
                    aria-hidden="true"
                  />
                  {{ user.emailVerified ? 'Yes' : !user.emailVerified ? 'No' : 'Not provided' }}
                </p>
              </div>
              <div>
                <p class="subtitle-2 text-muted mb-1">
                  Linked account
                </p>
                <p class="subtitle-1 fw-500 mb-0">
                  <span
                    v-if="providerInfo.providerId !== 'password'"
                    :aria-label="`Account linked with ${providerInfo.name}`"
                  >
                    <UiIconSvg
                      :content="getBrandIcon(providerInfo.icon)"
                      :size="providerInfo.size"
                      class="d-inline-block me-1"
                      :class="getBrandIconClass(providerInfo.icon)"
                    />
                    {{ providerInfo.name }}
                  </span>
                  <span
                    v-else
                    aria-label="Account uses email and password authentication"
                  >
                    <UiIconMaterial
                      :icon-code="providerInfo.icon"
                      class="fs-lg me-1"
                    />
                    {{ providerInfo.name }}
                  </span>
                </p>
              </div>
              <div>
                <p class="subtitle-2 text-muted mb-1">
                  Phone
                </p>
                <p class="subtitle-1 fw-500 mb-0">
                  <UiIconMaterial
                    :icon-code="user.providerData?.[0]?.phoneNumber ? '&#xe86c;' : '&#xf023;'"
                    :class="user.providerData?.[0]?.phoneNumber ? 'text-success iw-bold' : 'text-muted'"
                    class="fs-base me-1"
                  />
                  {{ user.providerData?.[0]?.phoneNumber || 'Not provided' }}
                </p>
              </div>
            </div>
          </template>
        </UiCard>
      </div>
    </div>
  </div>
</template>
