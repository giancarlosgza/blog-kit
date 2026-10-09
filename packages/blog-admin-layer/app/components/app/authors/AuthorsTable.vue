<script setup lang="ts">
import type { IDatatableColumn } from '@colorffy/ui'
import type { IAuthor } from '@giancarlosgza/blog-core'
import { breakpointsBootstrapV5, useBreakpoints } from '@vueuse/core'

/** Interfaces */
interface IProps {
  authors?: IAuthor[] | null
  isLoading?: boolean | null
}
interface ITableItem {
  uuid?: string
  name?: string
  slug?: string
  description?: string
  photoURL?: string
  profileLink?: string
  date?: any
  original: IAuthor
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  authors: null,
  isLoading: null
})

/** Data */
const tableColumns: IDatatableColumn[] = [
  { key: 'uuid', label: 'UUID', hidden: true },
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'slug', label: 'Slug' },
  { key: 'profile', label: 'Profile', sortable: false },
  { key: 'date', label: 'Date' },
  { key: 'actions', label: 'Actions', sortable: false }
]
const path = 'authors'
const breakpoints = useBreakpoints(breakpointsBootstrapV5)
const isMobile = breakpoints.smallerOrEqual('sm')

/** Composables */
const { blogUrl } = useBlogUrl()
const { formatDate, formatTitleDate } = useAdminDateFormat()

/** Computed */
const tableItems = computed<ITableItem[]>(() => {
  if (!props.authors?.length) {
    return []
  }
  return props.authors.map((item: IAuthor) => ({
    uuid: item.id ?? item.uid,
    name: item.name,
    slug: item.slug,
    description: item.description,
    photoURL: item.photoURL,
    profileLink: item.profileLink,
    date: item.createdAt,
    original: item
  }))
})
const normalizedLoading = computed<boolean | undefined>(() => props.isLoading ?? undefined)

/** Methods */
function openExternal(url: string): void {
  navigateTo(url, {
    external: true,
    open: { windowFeatures: { noopener: true }, target: '_blank' }
  })
}
function handleViewAuthor(item: IAuthor): void {
  if (item.slug)
    openExternal(`${blogUrl}/authors/${item.slug}`)
}
function handleViewProfile(item: IAuthor): void {
  if (item.profileLink)
    openExternal(item.profileLink)
}
function handleEditAuthor(item: IAuthor): void {
  const id = item.id ?? item.uid
  if (id)
    navigateTo({ path: `/${path}/${id}/edit` })
}
</script>

<template>
  <UiDatatable
    :columns="tableColumns"
    :items="tableItems"
    :is-loading="normalizedLoading"
    :skeleton-rows="8"
    table-class="table-bordered"
    sortable column-manager
    empty-state-title="No authors yet"
    empty-state-subtitle="Create your first author to attribute posts."
    class="d-grid"
    :toolbar-button="{ variant: 'text' }"
  >
    <template #controls>
      <AppTableSummary :text="`${tableItems.length} authors`" />
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
          v-if="item.photoURL"
          :src="item.photoURL"
          :alt="`${item.name || 'Author'} photo`"
          class="mx-0"
        />
        <UiAvatar
          v-else
          :initials="getInitials(item.name)"
          color="secondary"
          variant="filled"
          class="mx-0"
        />
        <span class="fw-500">
          {{ item.name || 'N/A' }}
        </span>
      </span>
    </template>
    <template #cell-description="{ item }">
      <span
        class="text-muted"
        :title="item.description"
      >
        {{ truncateText(item.description, 60) }}
      </span>
    </template>
    <template #cell-slug="{ item }">
      <span
        v-if="item.slug"
        class="text-link text-info"
      >
        /{{ item.slug }}
      </span>
      <span
        v-else
        class="text-muted"
      >N/A</span>
    </template>
    <template #cell-profile="{ item }">
      <span
        class="text-muted"
        :title="item.profileLink"
      >
        {{ truncateText(item.profileLink?.replace(/^https?:\/\//, ''), 32) }}
      </span>
    </template>
    <template #cell-date="{ item }">
      <span
        class="text-muted fl-capitalize"
        :title="formatTitleDate(item.date)"
      >
        {{ formatDate(item.date) }}
      </span>
    </template>
    <template #cell-actions="{ item }">
      <UiButtonGroup
        class="flex-nowrap"
        connected
      >
        <UiButtonTooltip
          :id="`author-${item.uuid}-edit`"
          variant="chip"
          text="Edit"
          tooltip-text="Edit author"
          @click="handleEditAuthor(item.original)"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe3c9;" />
          </template>
        </UiButtonTooltip>
        <UiButtonMenu
          :id="`author-${item.uuid}-actions`"
          variant="chip"
          icon
          tooltip-text="View author actions"
          :is-mobile="isMobile"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe5d3;" />
          </template>
          <template #menu>
            <UiButtonMenuItem
              icon="&#xe3c9;"
              item-text="Edit"
              @click="handleEditAuthor(item.original)"
            />
            <UiButtonMenuDivider />
            <UiButtonMenuItem
              icon="&#xe89e;"
              item-text="Visit on blog"
              :disabled="!item.slug"
              @click="handleViewAuthor(item.original)"
            />
            <UiButtonMenuItem
              v-if="item.profileLink"
              icon="&#xe157;"
              item-text="Visit profile"
              @click="handleViewProfile(item.original)"
            />
          </template>
        </UiButtonMenu>
      </UiButtonGroup>
    </template>
  </UiDatatable>
</template>
