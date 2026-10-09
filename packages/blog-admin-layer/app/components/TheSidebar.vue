<script setup lang="ts">
import type { AdminRole } from '#admin/shared/models/admin'
import { NuxtLink } from '#components'

/** Interfaces */
interface INavItem {
  id: string
  tooltipText: string
  name: string
  icon: string
  routeName: { name: string }
  badge?: number
}

/** Composables */
const route = useRoute()
const { organization } = useAppConfig().admin
const sidebarCollapse = useState<boolean>('sidebarCollapse', () => false)
const adminRole = useState<AdminRole | null>('adminRole', () => null)
const appVersion = useAppVersion()
const { count: reviewCount, refresh: refreshReviewCount } = useReviewQueueCount()

/** Computed */
const isAdmin = computed(() => adminRole.value === 'admin')
const contentNavItems = computed<INavItem[]>(() => [
  {
    id: 'posts-link',
    tooltipText: 'Posts',
    name: 'Posts',
    icon: '&#xef42;',
    routeName: { name: 'posts' }
  },
  {
    id: 'authors-link',
    tooltipText: 'Authors',
    name: 'Authors',
    icon: '&#xe7ef;',
    routeName: { name: 'authors' }
  },
  {
    id: 'tags-link',
    tooltipText: 'Tags',
    name: 'Tags',
    icon: '&#xe892;',
    routeName: { name: 'tags' }
  },
  ...(isAdmin.value
    ? [{
        id: 'reviews-link',
        tooltipText: reviewCount.value ? `Reviews, ${reviewCount.value} waiting` : 'Reviews',
        name: 'Reviews',
        icon: '&#xe8b5;',
        routeName: { name: 'reviews' },
        badge: reviewCount.value
      }]
    : []),
  {
    id: 'media-link',
    tooltipText: 'Media',
    name: 'Media',
    icon: '&#xe3f4;',
    routeName: { name: 'media' }
  }
])
const settingsNavItems = computed<INavItem[]>(() => [
  {
    id: 'branding-link',
    tooltipText: 'Branding',
    name: 'Branding',
    icon: '&#xe98e;',
    routeName: { name: 'settings' }
  }
])
const adminNavItems = computed<INavItem[]>(() => [
  ...(isAdmin.value
    ? [{
        id: 'admin-users-link',
        tooltipText: 'Administrators',
        name: 'Admins',
        icon: '&#xef3d;',
        routeName: { name: 'admin-users' }
      }]
    : []),
  {
    id: 'account-link',
    tooltipText: 'Account',
    name: 'Account',
    icon: '&#xe853;',
    routeName: { name: 'account' }
  }
])

/** Watch */
watch([isAdmin, () => route.path], ([admin]) => {
  if (admin && import.meta.client)
    refreshReviewCount()
}, { immediate: true })
</script>

<template>
  <UiSidebar
    v-model:open="sidebarCollapse"
    bordered
    :rail="sidebarCollapse"
  >
    <!-- Header -->
    <template #header>
      <IncludeAppLogo
        :width="192"
        :height="192"
        type="icon"
      />
      <UiSidebarDropdown
        :title="organization"
        subtitle="Blog Admin"
        :interactive="false"
      />
    </template>

    <!-- Body  -->
    <template #body>
      <!-- General -->
      <UiSidebarGroup
        text="General"
        icon="&#xe66b;"
      >
        <UiSidebarLink
          id="dashboard-link"
          :as="NuxtLink"
          :to="{ name: 'index' }"
          text="Dashboard"
          icon="&#xe66b;"
          tooltip-text="Dashboard"
          tooltip-placement="right-start"
        />
      </UiSidebarGroup>

      <!-- Content -->
      <UiSidebarGroup
        text="Content"
        icon="&#xef42;"
      >
        <UiSidebarLink
          v-for="link in contentNavItems"
          :id="`link-${link.name.toLowerCase().replace(/\s+/g, '-')}`"
          :key="link.routeName.name + link.name"
          :as="NuxtLink"
          :to="link.routeName"
          :text="link.name"
          :icon="link.icon"
          :tooltip-text="link.tooltipText"
          tooltip-placement="right-start"
        >
          <template
            v-if="link.badge"
            #badge
          >
            <UiBadge
              :text="String(link.badge)"
              :max="99"
              variant="tonal tonal-secondary"
              size="sm"
              custom-class="sidebar-link-badge"
            />
          </template>
        </UiSidebarLink>
      </UiSidebarGroup>

      <!-- AI -->
      <UiSidebarGroup
        text="AI"
        icon="&#xe65f;"
      >
        <UiSidebarLink
          id="link-ai-recommendations"
          :as="NuxtLink"
          :to="{ name: 'ai-recommendations' }"
          text="Recommendations"
          icon="&#xe65f;"
          tooltip-text="AI Recommendations"
          tooltip-placement="right-start"
        />
      </UiSidebarGroup>

      <!-- Settings -->
      <UiSidebarGroup
        v-if="isAdmin"
        text="Settings"
        icon="&#xe8b8;"
      >
        <UiSidebarLink
          v-for="link in settingsNavItems"
          :id="`link-${link.name.toLowerCase().replace(/\s+/g, '-')}`"
          :key="link.routeName.name + link.name"
          :as="NuxtLink"
          :to="link.routeName"
          :text="link.name"
          :icon="link.icon"
          :tooltip-text="link.tooltipText"
          tooltip-placement="right-start"
        />
      </UiSidebarGroup>

      <!-- Admin -->
      <UiSidebarGroup
        text="Admin"
        icon="&#xef3d;"
      >
        <UiSidebarLink
          v-for="link in adminNavItems"
          :id="`link-${link.name.toLowerCase().replace(/\s+/g, '-')}`"
          :key="link.routeName.name + link.name"
          :as="NuxtLink"
          :to="link.routeName"
          :text="link.name"
          :icon="link.icon"
          :tooltip-text="link.tooltipText"
          tooltip-placement="right-start"
        />
      </UiSidebarGroup>
    </template>

    <!-- Footer -->
    <template #footer>
      <div>
        <UiBadge
          :text="`v${appVersion}`"
          title="Client version"
          variant="outline"
          icon-code="&#xf720;"
          icon-class="text-accent-fixed"
        />
      </div>
    </template>
  </UiSidebar>
</template>
