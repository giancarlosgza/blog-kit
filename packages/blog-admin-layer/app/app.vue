<script setup lang="ts">
import type { AdminRole } from '#admin/shared/models/admin'

/** Composables */
const router = useRouter()
const { loadingColor } = useAppConfig().admin
const route = useRoute()
const user = useCurrentUser()
const adminRole = useState<AdminRole | null>('adminRole', () => null)
const adminRoleUid = useState<string | null>('adminRoleUid', () => null)

/** Watch */
watch(user, async (currentUser, previousUser) => {
  if (!currentUser && previousUser) {
    adminRole.value = null
    adminRoleUid.value = null
  }

  // Signed out on an auth-only route
  if (
    !currentUser
    && previousUser
    && (Array.isArray(route.meta.middleware)
      ? route.meta.middleware.includes('auth')
      : route.meta.middleware === 'auth')
  ) {
    return router.push({ name: 'auth-login' })
  }

  // Signed in after an early redirect
  if (currentUser && typeof route.query.redirect === 'string')
    return router.push(route.query.redirect)
})
</script>

<template>
  <div>
    <NuxtPwaAssets />
    <NuxtLoadingIndicator :color="loadingColor" />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
