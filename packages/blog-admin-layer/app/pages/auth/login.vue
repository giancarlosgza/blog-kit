<script setup lang="ts">
/** Head */
const runtimeConfig = useRuntimeConfig()
const { blogName, organization, login, legal } = useAppConfig().admin
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
const { user, error, loading, isBusy, redirectTo, signInWithGoogle, signInWithEmail, signOut } = useAdminSignIn()

/** Data */
const email = ref<string>('')
const password = ref<string>('')

const emailId = useId()
const passwordId = useId()
const currentYear = new Date().getFullYear()

/** Computed */
const canSignInEmail = computed<boolean>(() => !!email.value.trim() && !!password.value && !isBusy.value)

/** Methods */
function submitEmail() {
  if (canSignInEmail.value)
    signInWithEmail(email.value, password.value)
}
</script>

<template>
  <div class="auth-page">
    <section
      class="auth-card"
      aria-labelledby="login-heading"
    >
      <IncludeAppLogo
        type="icon"
        :width="48"
        :height="48"
      />
      <div class="auth-card-heading">
        <h1
          id="login-heading"
          class="auth-card-title"
        >
          Sign in
        </h1>
        <p class="text-muted mb-0">
          to the {{ blogName }} admin
        </p>
      </div>

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
        v-else-if="redirectTo"
        type="tonal"
        variant="warning"
        custom-class="mb-0"
        size="sm"
        :message="`Sign in to open '${redirectTo}'.`"
      />

      <!-- Signed-in user -->
      <AuthCurrentUser
        v-if="user"
        :display-name="user.displayName"
        :email="user.email"
        :photo-url="user.photoURL"
        :continue-to="redirectTo ?? '/'"
        continue-label="Continue to the admin"
        @sign-out="signOut"
      />

      <!-- Login methods -->
      <template v-else>
        <UiButton
          variant="outline"
          text="Continue with Google"
          :loading="loading === 'google'"
          :disabled="isBusy"
          size="lg"
          fluid
          rounded
          @click="signInWithGoogle"
        >
          <template #icon>
            <UiIconSvg
              :content="getBrandIcon('google')"
              :size="16"
            />
          </template>
        </UiButton>

        <p class="subtitle-2 text-muted text-decoration-side-lines mb-0">
          or
        </p>

        <form
          class="auth-card-form"
          action="#"
          aria-label="Email and password sign-in"
          @submit.prevent="submitEmail"
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
          <UiInputPassword
            :id="passwordId"
            v-model="password"
            label="Password"
            placeholder="Your password"
            required
          />
          <UiButton
            type="submit"
            variant="filled"
            text="Sign in"
            :loading="loading === 'email'"
            :disabled="!canSignInEmail"
            size="lg"
            fluid
            rounded
          />
        </form>
      </template>

      <p class="subtitle-2 text-muted mb-0">
        {{ login.staffNotice }}
      </p>
    </section>

    <footer class="auth-page-footer">
      <span>© {{ currentYear }} {{ organization }}</span>
      <a
        v-if="blogUrl"
        :href="blogUrl"
        target="_blank"
        rel="noopener"
      >
        Go to the blog
      </a>
      <a
        v-if="legal.termsUrl"
        :href="legal.termsUrl"
        target="_blank"
        rel="noopener"
      >
        Terms
      </a>
      <a
        v-if="legal.privacyUrl"
        :href="legal.privacyUrl"
        target="_blank"
        rel="noopener"
      >
        Privacy
      </a>
    </footer>
  </div>
</template>
