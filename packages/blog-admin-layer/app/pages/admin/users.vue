<script setup lang="ts">
import type { IDialogDisplay, UiAlertToast } from '@colorffy/ui'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import type AppUsersCreateUserDialog from '#admin/app/components/app/users/CreateUserDialog.vue'
import type { AdminRole, IAdmin } from '#admin/shared/models/admin'
import { useToast } from '@colorffy/ui'

/** Head */
const route = useRoute()
const siteUrl = useAdminSiteUrl()

definePageMeta({
  pageTitle: 'Admins',
  roles: ['admin'],
  middleware: ['auth']
})
useSeoMeta({
  title: 'Admins',
  description: 'View and manage the admin users.',
  ogTitle: 'Admins',
  ogDescription: 'View and manage the admin users.',
  ogUrl: siteUrl ? `${siteUrl}${route.path}` : undefined,
  twitterTitle: 'Admins',
  twitterDescription: 'View and manage the admin users.',
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

/** Data */
const docsLimit = 12
const users = ref<IAdmin[]>([])
const lastDoc = ref<QueryDocumentSnapshot<DocumentData> | null>(null)
const hasMoreUsers = ref<boolean>(false)
const error = ref<Error | null>(null)
const isLoading = ref<boolean>(false)
const isLoadingMore = ref<boolean>(false)
const selectedUser = ref<IAdmin | null>(null)
const pendingRole = ref<AdminRole>('editor')

const confirmDeleteDialog = ref<IDialogDisplay>()
const confirmRoleDialog = ref<IDialogDisplay>()
const createUserDialog = useTemplateRef<InstanceType<typeof AppUsersCreateUserDialog>>('createUserDialog')

/** Composables */
const currentUser = useCurrentUser()
const toast = ref<InstanceType<typeof UiAlertToast> | null>(null)
const { onToastMessage } = useToast(toast)
const { getAdmins, deleteAdmin, setRole } = useAdminUsers()

/** Computed */
const hasNotDocs = computed<boolean>(() => !isLoading.value && (!users.value || users.value.length < 1))
const currentUserId = computed<string | null>(() => currentUser.value?.uid ?? null)
const selectedUserName = computed<string>(() => selectedUser.value?.displayName ?? selectedUser.value?.name ?? selectedUser.value?.id ?? 'this user')

/** Lifecycle */
onMounted(() => {
  fetchAdminUsers()
})

/** Methods */
function isCurrentUser(userId: string | null | undefined): boolean {
  return Boolean(userId && currentUserId.value && userId === currentUserId.value)
}

async function fetchAdminUsers(): Promise<void> {
  isLoading.value = true
  hasMoreUsers.value = false

  try {
    const result = await getAdmins({ limit: docsLimit })

    users.value = result.users
    lastDoc.value = result.lastDoc
    hasMoreUsers.value = result.hasMore
    error.value = null
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to load admin users'
    error.value = err instanceof Error ? err : new Error(message)
    onToastMessage('danger', message)
    console.log('Failed to fetch admin users:', err)
  } finally {
    isLoading.value = false
  }
}
async function loadMoreUsers(): Promise<void> {
  if (!hasMoreUsers.value || !lastDoc.value || isLoadingMore.value)
    return

  isLoadingMore.value = true

  try {
    const result = await getAdmins({ limit: docsLimit, startAfter: lastDoc.value })

    if (!result.users.length) {
      hasMoreUsers.value = false
      return
    }

    users.value = [...users.value, ...result.users]
    lastDoc.value = result.lastDoc
    hasMoreUsers.value = result.hasMore
  } catch (err: unknown) {
    onToastMessage('danger', 'Unable to load more users')
    console.log('Failed to load more admin users:', err)
  } finally {
    isLoadingMore.value = false
  }
}
function updateUserList(userId: string, changes: Partial<IAdmin>) {
  users.value = users.value.map((user) => {
    if (user.id !== userId) {
      return user
    }
    return { ...user, ...changes }
  })
}

async function handleDeleteUser(): Promise<void> {
  const user = selectedUser.value

  if (!user?.id) {
    return
  }
  if (isCurrentUser(user.id)) {
    onToastMessage('warning', 'You cannot delete your own account')
    confirmDeleteDialog.value?.closeDialog()
    return
  }

  isLoading.value = true

  try {
    await deleteAdmin(user.id)
    users.value = users.value.filter(existing => existing.id !== user.id)
    onToastMessage('success', 'User deleted successfully')

    if (users.value.length && hasMoreUsers.value) {
      await loadMoreUsers()
    }

    setTimeout(() => {
      confirmDeleteDialog.value?.closeDialog()
    }, 300)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to delete user'
    onToastMessage('danger', message)
    console.log('Failed to delete admin user:', err)
  } finally {
    isLoading.value = false
  }
}
async function handleSetRole(): Promise<void> {
  const user = selectedUser.value
  const role = pendingRole.value

  if (!user?.id) {
    return
  }
  if (isCurrentUser(user.id)) {
    onToastMessage('warning', 'You cannot change your own role')
    confirmRoleDialog.value?.closeDialog()
    return
  }

  isLoading.value = true

  try {
    await setRole(user, role)
    updateUserList(user.id, { role, isAdmin: role === 'admin' })
    onToastMessage('success', role === 'admin' ? 'User set as admin' : 'User set as editor')
    setTimeout(() => {
      confirmRoleDialog.value?.closeDialog()
    }, 300)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to update role'
    onToastMessage('danger', message)
    console.log('Failed to update role:', err)
  } finally {
    isLoading.value = false
  }
}
function openRoleDialog(user: IAdmin, role: AdminRole): void {
  selectedUser.value = user
  pendingRole.value = role

  if (!user?.id) {
    onToastMessage('warning', 'Invalid user selection')
    return
  }
  if (isCurrentUser(user.id)) {
    onToastMessage('warning', 'You cannot change your own role')
    return
  }

  confirmRoleDialog.value?.showDialog()
}
function openDeleteDialog(user: IAdmin): void {
  selectedUser.value = user

  if (isCurrentUser(user.id)) {
    onToastMessage('warning', 'You cannot delete your own account')
    return
  }
  if (!user?.id) {
    onToastMessage('warning', 'Invalid user selection')
    return
  }

  confirmDeleteDialog.value?.showDialog()
}
function handleUserCreated(message: string): void {
  onToastMessage('success', message)
  fetchAdminUsers()
}
</script>

<template>
  <div class="container-fluid mb-5">
    <!-- Header -->
    <UiHeaderContent
      title="Admins"
      subtitle="View and manage the admin users"
      view-transition-name="selected-headline"
      hide-actions-when-narrow
    >
      <template #actions>
        <UiButtonGroup connected>
          <UiButton
            variant="filled"
            text="Create user"
            @click="createUserDialog?.showDialog()"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe145;" />
            </template>
          </UiButton>
        </UiButtonGroup>
      </template>
    </UiHeaderContent>

    <!-- Error -->
    <UiAlert
      v-if="error"
      type="tonal"
      variant="danger"
      size="sm"
      :message="`${error}`"
      class="mb-1"
    />

    <!-- Content -->
    <UiCard variant="pane">
      <template #body>
        <!-- Empty state -->
        <div v-if="hasNotDocs">
          <UiEmpty
            title="No users found"
            subtitle="Create your first user to get started."
          />
        </div>

        <!-- Layout -->
        <AppUsersAdminsTable
          v-else
          :users="users"
          :is-loading="isLoading"
          :current-user-id="currentUserId"
          @reload="fetchAdminUsers"
          @delete-user="openDeleteDialog"
          @set-role="openRoleDialog"
        />
      </template>
    </UiCard>

    <!-- Load more -->
    <div class="d-grid grid-repeat-cols-1 align-items-center gap-3 mt-section mt-section-md">
      <div class="text-decoration-side-lines">
        <UiButton
          v-if="!hasNotDocs"
          variant="outline"
          class="hover-rotate"
          :text="!hasMoreUsers ? 'No more users' : 'Show more'"
          aria-label="Show more users"
          :aria-busy="isLoadingMore"
          :disabled="!hasMoreUsers || isLoadingMore"
          @click="loadMoreUsers"
        >
          <template #icon>
            <UiIconMaterial :icon-code="!hasMoreUsers ? '&#xea76;' : '&#xe863;'" />
          </template>
        </UiButton>
      </div>
      <div class="justify-items-md-end">
        <p class="subtitle-2 text-muted mb-0">
          Showing {{ users.length }} users
        </p>
      </div>
    </div>

    <!-- FAB -->
    <div class="fab-group">
      <UiButton
        variant="gradient"
        custom-class="btn-fab fab-mobile"
        aria-label="New user"
        @click="createUserDialog?.showDialog()"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe7fe;" />
        </template>
      </UiButton>
    </div>

    <!-- Dialogs -->
    <AppUsersCreateUserDialog
      ref="createUserDialog"
      @saved="handleUserCreated"
      @error="onToastMessage('danger', $event)"
    />

    <UiConfirmModal
      ref="confirmDeleteDialog"
      :title="`Delete ${selectedUserName}?`"
      :message="`Are you sure you want to delete ${selectedUserName}? This removes their admin access (the Firebase Auth account is not deleted).`"
      confirm-label="Yes, delete"
      variant="danger"
      :is-loading="isLoading"
      @confirm="handleDeleteUser"
    />
    <UiConfirmModal
      ref="confirmRoleDialog"
      :variant="pendingRole === 'admin' ? 'primary' : 'warning'"
      :title="pendingRole === 'admin' ? `Make ${selectedUserName} an admin?` : `Set ${selectedUserName} as editor?`"
      :message="pendingRole === 'admin'
        ? `Are you sure you want to grant ${selectedUserName} full admin access?`
        : `Are you sure you want to limit ${selectedUserName} to editor (content only) access?`"
      :confirm-label="pendingRole === 'admin' ? 'Yes, make admin' : 'Yes, set editor'"
      loading-label="Updating..."
      :is-loading="isLoading"
      @confirm="handleSetRole"
    />

    <!-- Toast -->
    <UiAlertToast ref="toast" />
  </div>
</template>
