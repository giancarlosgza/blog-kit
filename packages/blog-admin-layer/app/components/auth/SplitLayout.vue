<script setup lang="ts">
/** Interfaces */
interface IAuthSplitLayoutProps {
  headingId: string
  /** Shrinks the mobile card band */
  compact?: boolean
  wallOffset?: number
}

/** Props */
const { headingId, compact = false, wallOffset = 0 } = defineProps<IAuthSplitLayoutProps>()

/** Composables */
const { organization, login, legal } = useAppConfig().admin

const currentYear = new Date().getFullYear()
</script>

<template>
  <div
    class="auth-split"
    :class="{ 'is-compact': compact }"
  >
    <header class="auth-split-header">
      <NuxtLink
        :to="{ name: 'index' }"
        class="auth-split-logo"
        aria-label="Go to homepage"
        title="Go to homepage"
      >
        <IncludeAppLogo
          type="wordmark"
          :width="104"
          :height="25"
        />
      </NuxtLink>
      <slot name="header-action" />
    </header>

    <aside
      class="auth-split-aside"
      :aria-label="login.wallLabel"
    >
      <AuthCardWall :offset="wallOffset" />
      <div
        v-if="$slots.note"
        class="auth-split-note"
      >
        <span
          class="auth-split-note-dot"
          aria-hidden="true"
        />
        <slot name="note" />
      </div>
    </aside>

    <section
      class="auth-split-content"
      :aria-labelledby="headingId"
    >
      <div class="auth-split-form">
        <slot />
      </div>
    </section>

    <footer class="auth-split-footer">
      <span>© {{ currentYear }} {{ organization }}</span>
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
