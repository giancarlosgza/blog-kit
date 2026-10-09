<script setup lang="ts">
import type { UiAlertToast } from '@colorffy/ui'
import { useToast } from '@colorffy/ui'
import { vOnClickOutside } from '@vueuse/components'
import { NuxtLink } from '#components'

/** Composables */
const user = useCurrentUser()
const auth = useFirebaseAuth()!
const route = useRoute()
const router = useRouter()

/** Data */
const isMenuActive = ref<boolean>(false)
const isMenuSuggestionsActive = ref<boolean>(false)
const sidebarCollapse = useState<boolean>('sidebarCollapse')

const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)

const menuItems = [
  {
    id: 'home',
    to: '/',
    icon: '&#xe66b;',
    text: 'Dashboard',
    ariaLabel: 'Navigate to dashboard page'
  },
  {
    id: 'account',
    to: '/account',
    icon: '&#xe853;',
    text: 'Account',
    ariaLabel: 'Go to account page'
  }
]
const menuSuggestionsItems = [
  {
    id: 'create-post',
    to: '/posts/new',
    icon: '&#xef42;',
    text: 'Create Post',
    ariaLabel: 'Go to create post page'
  },
  {
    id: 'create-author',
    to: '/authors/create',
    icon: '&#xe7ef;',
    text: 'Create Author',
    ariaLabel: 'Go to create author page'
  },
  {
    id: 'create-tag',
    to: '/tags',
    icon: '&#xe892;',
    text: 'Create Tag',
    ariaLabel: 'Go to tags page'
  },
  {
    id: 'upload-media',
    to: '/media',
    icon: '&#xe3f4;',
    text: 'Upload Media',
    ariaLabel: 'Go to media library'
  }
]

/** Computed */
const userData = computed(() => ({
  displayName: user.value?.displayName || 'User',
  email: user.value?.email || '',
  photoURL: user.value?.photoURL || '/avatar.png'
}))

/** Methods */
function toggleUserMenu(): void {
  isMenuActive.value = !isMenuActive.value
}
function toggleMenuSuggestions(): void {
  isMenuSuggestionsActive.value = !isMenuSuggestionsActive.value
}
function closeMenu(): void {
  isMenuActive.value = false
}
function closeMenuSuggestions(): void {
  isMenuSuggestionsActive.value = false
}
function closeMenus(): void {
  isMenuActive.value = false
  isMenuSuggestionsActive.value = false
}
function handleSignOut(): void {
  auth.signOut()
    .then(() => {
      closeMenu()
      router.push({ name: 'auth-login' })
    })
    .catch((err) => {
      onToastMessage('danger', `Sign out failed: ${err.message || 'An error occurred while signing out. Please try again.'}`)
    })
}
</script>

<template>
  <UiNavbar
    v-on-click-outside="closeMenus"
    sticky
    fluid
  >
    <UiNavbarToggle
      :collapsed="sidebarCollapse"
      show-toggle-button
      @toggle="sidebarCollapse = !sidebarCollapse"
    />
    <UiNavbarMobileMenu>
      <UiNavbarAvatar
        v-if="user"
        :src="userData.photoURL"
        :alt="`${userData.displayName} photo`"
        size="navbar"
        class="border border-md border-gradient gradient-info p-px rounded-full"
        @click="isMenuActive = !isMenuActive"
      />
    </UiNavbarMobileMenu>

    <UiNavbarCollapse>
      <UiNavbarNav position="end">
        <UiNavbarItem>
          <UiBadge
            text="BLOG"
            variant="outline"
            size="sm"
            custom-class="border border-md border-gradient gradient-info align-items-center my-0"
          />
        </UiNavbarItem>
        <UiNavbarItem class="avatar-link">
          <span
            class="nav-link mx-2"
            role="button"
            title="Quick Actions"
            aria-label="Open quick actions menu"
            @click="toggleMenuSuggestions(); closeMenu()"
          >
            <span>
              <UiIconMaterial
                icon-code="&#xf3dd;"
                class="fs-lg text-on-body"
              />
            </span>
          </span>
        </UiNavbarItem>
        <UiNavbarItem class="avatar-link">
          <UiNavbarAvatar
            v-if="user"
            :src="userData.photoURL"
            :alt="`${userData.displayName} photo`"
            size="navbar"
            class="border border-lg border-gradient gradient-info p-px rounded-full"
            @click="toggleUserMenu(); closeMenuSuggestions()"
          />
        </UiNavbarItem>
      </UiNavbarNav>
    </UiNavbarCollapse>

    <!-- Popover menus -->
    <UiPopoverMenu
      id="menu-quick-actions"
      title="Quick Actions"
      :is-opened="isMenuSuggestionsActive"
      :current-route="route"
      :closable="false"
      @hide-dropdown="closeMenuSuggestions"
    >
      <template #body>
        <UiPopoverMenuGroup>
          <UiPopoverMenuItem
            v-for="item in menuSuggestionsItems"
            :key="item.id"
            :as="NuxtLink"
            :to="item.to"
            :text="item.text"
            :icon="item.icon"
            :aria-label="item.ariaLabel"
            class="p-1"
          />
        </UiPopoverMenuGroup>
      </template>
      <template #footer>
        <UiButton
          variant="outline"
          text="Close"
          fluid
          @click="closeMenuSuggestions"
        />
      </template>
    </UiPopoverMenu>
    <UiPopoverMenu
      id="menu-user"
      :is-opened="isMenuActive"
      :closable="false"
      @hide-dropdown="closeMenu"
    >
      <template #header>
        <UiPopoverMenuUser
          :user="userData"
          avatar-class="border border-lg border-gradient gradient-info p-px mb-2"
        >
          <template #trailing>
            <UiBadge
              text="BLOG"
              variant="outline"
              size="sm"
              custom-class="border border-md border-gradient gradient-info"
            />
          </template>
        </UiPopoverMenuUser>
      </template>
      <template #body>
        <!-- Menu -->
        <UiPopoverMenuGroup>
          <UiPopoverMenuItem
            v-for="item in menuItems"
            :key="item.id"
            :as="NuxtLink"
            :to="item.to"
            :text="item.text"
            :icon="item.icon"
            :aria-label="item.ariaLabel"
            class="p-1"
          />
        </UiPopoverMenuGroup>
        <UiDivider class="my-0" />

        <!-- Theme -->
        <UiPopoverMenuGroup>
          <UiPopoverMenuItem
            as="div"
            text="Theme"
            class="p-1"
          >
            <template #trailing>
              <LazyIncludeColorModePicker :show-labels="false" />
            </template>
          </UiPopoverMenuItem>
        </UiPopoverMenuGroup>
        <UiDivider class="my-0" />

        <!-- Sign out -->
        <UiPopoverMenuGroup>
          <UiPopoverMenuItem
            icon="&#xe879;"
            text="Sign Out"
            icon-class="text-danger"
            class="p-1"
            @click="handleSignOut"
          />
        </UiPopoverMenuGroup>
      </template>
    </UiPopoverMenu>

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </UiNavbar>
</template>
