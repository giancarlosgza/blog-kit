<script setup lang="ts">
import type { AdminRole } from '#admin/shared/models/admin'
import { NuxtLink } from '#components'

/** Data */
const route = useRoute()
const adminRole = useState<AdminRole | null>('adminRole', () => null)
const navigationItems = computed(() => [
  {
    id: 'home-bar-link',
    text: 'Dashboard',
    icon: '&#xe88a;',
    to: '/',
    ariaLabel: 'Go to Dashboard page'
  },
  {
    id: 'posts-bar-link',
    text: 'Posts',
    icon: '&#xef42;',
    to: '/posts',
    ariaLabel: 'Go to Posts page'
  },
  {
    id: 'authors-bar-link',
    text: 'Authors',
    icon: '&#xe7ef;',
    to: '/authors',
    ariaLabel: 'Go to Authors page'
  },
  {
    id: 'tags-bar-link',
    text: 'Tags',
    icon: '&#xe892;',
    to: '/tags',
    ariaLabel: 'Go to Tags page'
  },
  ...(adminRole.value === 'admin'
    ? [{
        id: 'settings-bar-link',
        text: 'Settings',
        icon: '&#xe8b8;',
        to: '/settings',
        ariaLabel: 'Go to Settings page'
      }]
    : [])
])
</script>

<template>
  <div class="grid-main-content">
    <TheSidebar />

    <main>
      <!-- Content -->
      <TheNavbar />
      <slot />
      <UiNavigationBar
        :as="NuxtLink"
        :items="navigationItems"
        :active-item="route.path"
        frosted indicator-tab
      />

      <!-- PWA Prompt -->
      <IncludePwaPromptAlert />
    </main>
  </div>
</template>
