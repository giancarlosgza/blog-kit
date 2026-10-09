<script setup lang="ts">
import type { IDatatableColumn } from '@colorffy/ui'
import type { AdminRole, IAdmin } from '#admin/shared/models/admin'
import { breakpointsBootstrapV5, useBreakpoints } from '@vueuse/core'

/** Interfaces */
interface IProps {
  users?: IAdmin[] | null
  isLoading?: boolean | null
  currentUserId?: string | null
}
interface IEmits {
  reload: []
  setRole: [IAdmin, AdminRole]
  deleteUser: [IAdmin]
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  users: null,
  isLoading: null,
  currentUserId: null
})

/** Emit */
const emit = defineEmits<IEmits>()

/** Data */
const tableColumns: IDatatableColumn[] = [
  { key: 'uuid', label: 'UUID', hidden: true },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'actions', label: 'Actions', sortable: false }
]

/** Composables */
const breakpoints = useBreakpoints(breakpointsBootstrapV5)
const isMobile = breakpoints.smallerOrEqual('sm')
const { formatDate, formatTitleDate } = useAdminDateFormat()

/** Computed */
const tableItems = computed(() => {
  if (!props.users) {
    return []
  }
  return props.users.map((item) => {
    const role: AdminRole = item.role ?? (item.isAdmin ? 'admin' : 'editor')
    return {
      uuid: item.id,
      name: item.displayName ?? item.name,
      email: item.email,
      role,
      isAdmin: role === 'admin',
      createdAt: item.createdAt,
      original: item
    }
  })
})
const isActionsDisabled = computed<boolean>(() => Boolean(props.isLoading))

/** Methods */
function isCurrentUser(userId: string | null | undefined): boolean {
  if (!userId || !props.currentUserId) {
    return false
  }
  return userId === props.currentUserId
}
</script>

<template>
  <UiDatatable
    :columns="tableColumns"
    :items="tableItems"
    :is-loading="!!isLoading"
    table-class="table-bordered"
    sortable column-manager
    empty-state-title="No users found"
    empty-state-subtitle="When admins are added, they will appear here."
    class="d-grid"
    :toolbar-button="{ variant: 'text' }"
  >
    <template #controls>
      <AppTableSummary :text="`${tableItems.length} users`" />
    </template>
    <template #cell-uuid="{ item }">
      <span
        class="fw-500 text-muted"
        :title="item.uuid || 'N/A'"
      >
        {{ item.uuid }}
      </span>
    </template>
    <template #cell-name="{ item }">
      <span class="d-inline-flex align-items-center gap-2">
        <UiAvatar
          :initials="getInitials(item.name)"
          :color="item.isAdmin ? 'info' : 'neutral'"
          variant="tonal"
          class="mx-0"
        />
        <span class="fw-500">
          {{ item.name || '-' }}
        </span>
      </span>
    </template>
    <template #cell-email="{ item }">
      <span class="text-muted">{{ item.email || '-' }}</span>
    </template>
    <template #cell-role="{ item }">
      <UiBadge
        variant="outline"
        size="sm"
        :text="item.isAdmin ? 'Admin' : 'Editor'"
        :icon-code="item.isAdmin ? '&#xef3d;' : '&#xe3c9;'"
        :icon-class="item.isAdmin ? 'text-info' : 'text-muted'"
      />
    </template>
    <template #cell-createdAt="{ item }">
      <span
        class="text-muted fl-capitalize"
        :title="formatTitleDate(item.createdAt || null)"
      >
        {{ formatDate(item.createdAt || null) }}
      </span>
    </template>
    <template #cell-actions="{ item }">
      <UiButtonMenu
        variant="chip"
        tooltip-text="View actions"
        icon
        :is-mobile="isMobile"
        :disabled="isActionsDisabled"
        aria-label="User actions"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5d3;" />
        </template>
        <template #menu>
          <UiButtonMenuItem
            v-if="!item.isAdmin"
            icon="&#xef3d;"
            item-text="Set as admin"
            :disabled="isCurrentUser(item.uuid)"
            @click="emit('setRole', item.original, 'admin')"
          />
          <UiButtonMenuItem
            v-else
            icon="&#xe3c9;"
            item-text="Set as editor"
            :disabled="isCurrentUser(item.uuid)"
            @click="emit('setRole', item.original, 'editor')"
          />
          <UiButtonMenuDivider />
          <UiButtonMenuItem
            icon="&#xe872;"
            item-text="Delete user"
            is-destructive
            :disabled="isCurrentUser(item.uuid)"
            @click="emit('deleteUser', item.original)"
          />
        </template>
      </UiButtonMenu>
    </template>
  </UiDatatable>
</template>
