<script setup lang="ts">
import type { BrandIcon } from '#admin/app/utils/brand-icons'
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'

/** Interfaces */
interface ISocialProvider {
  id: string
  name: string
  icon: BrandIcon
  size: number
}

/** Head */
const runtimeConfig = useRuntimeConfig()
const { blogName, login } = useAppConfig().admin
const route = useRoute()
const siteUrl = runtimeConfig.public.siteUrl as string | undefined
const blogUrl = runtimeConfig.public.blogUrl as string

definePageMeta({
  layout: 'auth'
})
useSeoMeta({
  title: 'Sign In',
  description: `Sign in to the ${blogName} admin.`,
  ogTitle: 'Sign In',
  ogDescription: `Sign in to the ${blogName} admin.`,
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Sign In',
  twitterDescription: `Sign in to the ${blogName} admin.`,
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
const auth = useFirebaseAuth()
const user = useCurrentUser()

/** Data */
const error = ref<string>('')
const isLoading = ref<boolean>(false)
const isEmailLoading = ref<boolean>(false)
const isEmailLoginActive = ref<boolean>(false)
const email = ref<string>('')
const password = ref<string>('')

const emailId = useId()
const passwordId = useId()
const emailFormId = useId()

const socialProviders: ISocialProvider[] = [
  { id: 'Google', name: 'Google', icon: 'google', size: 16 }
]

/** Computed */
const canSignInEmail = computed<boolean>(() => !!email.value.trim() && !!password.value && !isEmailLoading.value)
const isBusy = computed<boolean>(() => isLoading.value || isEmailLoading.value)
const emailToggleText = computed<string>(() => isEmailLoginActive.value ? 'Hide email form' : 'Continue with email')
const emailToggleIcon = computed<string>(() => isEmailLoginActive.value ? '&#xe5ce;' : '&#xe158;')
const safeRedirect = computed<string | null>(() => {
  const r = route.query.redirect
  if (typeof r !== 'string' || !r.startsWith('/') || r.startsWith('//'))
    return null
  return r
})

/** Methods */
async function signIn() {
  if (!auth)
    return

  isLoading.value = true
  error.value = ''
  try {
    await signInWithPopup(auth, new GoogleAuthProvider())
    await navigateTo(safeRedirect.value ?? '/')
  } catch (err: any) {
    error.value = err?.message || 'Sign-in failed.'
  } finally {
    isLoading.value = false
  }
}
async function signInEmail() {
  if (!auth || !canSignInEmail.value)
    return

  isEmailLoading.value = true
  error.value = ''
  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    await navigateTo(safeRedirect.value ?? '/')
  } catch (err: any) {
    console.log('Email sign-in failed:', err?.code)
    switch (err?.code) {
      case 'auth/operation-not-allowed':
        error.value = 'Email/password sign-in is disabled.'
        break
      case 'auth/too-many-requests':
        error.value = 'Too many attempts, try again later.'
        break
      default:
        error.value = 'Invalid email or password.'
    }
  } finally {
    isEmailLoading.value = false
  }
}
function toggleEmailForm() {
  isEmailLoginActive.value = !isEmailLoginActive.value
}
async function handleSignOut() {
  if (!auth)
    return

  error.value = ''
  try {
    await signOut(auth)
  } catch (err: any) {
    error.value = err?.message || 'Sign-out failed.'
  }
}
</script>

<template>
  <AuthSplitLayout heading-id="login-heading">
    <!-- Header action -->
    <template #header-action>
      <UiButton
        as="a"
        :href="blogUrl"
        target="_blank"
        rel="noopener"
        variant="outline"
        text="Go to the blog"
        :aria-label="`Open the ${blogName}`"
        rounded
      />
    </template>

    <!-- Heading -->
    <UiHeroContent
      id="login-heading"
      title="Welcome back"
      :subtitle="`Sign in to the ${blogName} admin.`"
      size="lg"
    />

    <!-- Alerts -->
    <UiAlert
      v-if="error"
      :message="error"
      type="tonal"
      variant="danger"
      custom-class="mb-0"
      size="sm"
    />
    <UiAlert
      v-else-if="safeRedirect"
      type="tonal"
      variant="warning"
      custom-class="mb-0"
      size="sm"
      :message="`Login to access '${safeRedirect}'.`"
    />

    <!-- Signed-in user -->
    <AuthCurrentUser
      v-if="user"
      :display-name="user.displayName"
      :email="user.email"
      :photo-url="user.photoURL"
      :continue-to="safeRedirect ?? '/'"
      continue-label="Continue to the blog admin"
      @sign-out="handleSignOut"
    />

    <!-- Login methods -->
    <template v-else>
      <AuthSocialButtons
        :providers="socialProviders"
        action-text="Continue with"
        :active-provider="isLoading ? 'Google' : null"
        :is-social-loading="isLoading"
        :disabled="isBusy"
        @select="signIn"
      />

      <p class="subtitle-2 text-muted text-decoration-side-lines mb-0">
        or
      </p>

      <!-- Email -->
      <UiButton
        variant="outline"
        :text="emailToggleText"
        :disabled="isBusy"
        :aria-label="`${emailToggleText} - ${isEmailLoginActive ? 'Hide' : 'Show'} email login form`"
        :aria-expanded="isEmailLoginActive"
        :aria-controls="emailFormId"
        size="lg"
        fluid
        rounded
        @click="toggleEmailForm"
      >
        <template #icon>
          <UiIconMaterial :icon-code="emailToggleIcon" />
        </template>
      </UiButton>

      <form
        v-if="isEmailLoginActive"
        :id="emailFormId"
        class="auth-split-email"
        action="#"
        aria-label="Email and password login form"
        @submit.prevent="signInEmail"
      >
        <UiInputText
          :id="emailId"
          v-model="email"
          label="Email"
          type="email"
          placeholder="name@example.com"
          autocomplete="email"
          required
        />
        <UiInputText
          :id="passwordId"
          v-model="password"
          label="Password"
          type="password"
          placeholder="Your password"
          autocomplete="current-password"
          required
        />
        <UiButton
          type="submit"
          variant="filled"
          text="Sign in"
          :loading="isEmailLoading"
          :disabled="!canSignInEmail"
          aria-label="Sign in with email and password"
          custom-class="mt-2"
          size="lg"
          fluid
          rounded
        />
      </form>
    </template>

    <p class="subtitle-2 text-muted mb-0">
      {{ login.staffNotice }}
    </p>

    <!-- Wall note -->
    <template
      v-if="login.wallNote"
      #note
    >
      {{ login.wallNote }}
      <UiButton
        v-if="login.wallLink.url"
        as="a"
        :href="login.wallLink.url"
        target="_blank"
        rel="noopener"
        variant="tonal"
        size="sm"
        :text="login.wallLink.text"
        rounded
      />
    </template>
  </AuthSplitLayout>
</template>
