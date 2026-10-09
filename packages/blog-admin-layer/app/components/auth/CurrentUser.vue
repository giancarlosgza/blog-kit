<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { BrandIcon } from '#admin/app/utils/brand-icons'

/** Interfaces */
interface IAuthCurrentUserProps {
  displayName?: string | null
  email?: string | null
  photoUrl?: string | null
  continueTo: RouteLocationRaw
  continueLabel?: string
  providerLabel?: string
  providerIcon?: BrandIcon | null
}
interface IAuthCurrentUserEmits {
  (e: 'signOut'): void
}

/** Props */
const {
  displayName = null,
  email = null,
  photoUrl = null,
  continueTo,
  continueLabel = 'Continue to the dashboard',
  providerLabel = 'Google',
  providerIcon = 'google'
} = defineProps<IAuthCurrentUserProps>()

/** Emit */
const emit = defineEmits<IAuthCurrentUserEmits>()

/** Computed */
const name = computed((): string => displayName?.trim() || email?.trim() || 'Signed-in user')
const initials = computed((): string => {
  const parts = name.value.split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[parts.length - 1]![0]}` : name.value.slice(0, 2)
  return letters.toUpperCase()
})
</script>

<template>
  <section
    class="auth-current"
    aria-labelledby="current-user-heading"
  >
    <h2
      id="current-user-heading"
      class="visually-hidden"
    >
      Current user status
    </h2>
    <p class="caption text-muted mb-0">
      Continue as
    </p>
    <NuxtLink
      :to="continueTo"
      class="auth-current-row undecorated"
      :aria-label="`${continueLabel} as ${name}`"
    >
      <UiAvatar
        :src="photoUrl ?? undefined"
        :initials="initials"
        :alt="name"
        size="menu"
      />
      <span class="auth-current-identity">
        <span class="auth-current-name">{{ name }}</span>
        <span
          v-if="email"
          class="auth-current-email"
        >{{ email }}</span>
      </span>
      <span class="auth-current-provider">
        <UiIconSvg
          v-if="providerIcon"
          :content="getBrandIcon(providerIcon)"
          :class="getBrandIconClass(providerIcon)"
          :size="12"
        />
        {{ providerLabel }}
      </span>
      <UiIconMaterial
        icon-code="&#xe5cc;"
        class="auth-current-chevron"
        aria-hidden="true"
      />
    </NuxtLink>
    <div class="auth-current-footer">
      <p class="subtitle-2 text-muted mb-0">
        Not you?
      </p>
      <UiButton
        variant="text"
        text="Sign out"
        aria-label="Sign out of your account"
        size="sm"
        rounded
        @click="emit('signOut')"
      >
        <template #icon>
          <UiIconMaterial
            icon-code="&#xe9ba;"
            class="text-danger"
          />
        </template>
      </UiButton>
    </div>
  </section>
</template>
