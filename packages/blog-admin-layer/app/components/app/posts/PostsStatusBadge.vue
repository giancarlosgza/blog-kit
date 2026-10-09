<script setup lang="ts">
import type { PostStatus } from '#admin/shared/models/post'
import { POST_STATUS_BADGES, POST_STATUS_LABELS } from '#admin/shared/utils/post-status'

/** Interfaces */
interface IProps {
  status: PostStatus
  size?: 'sm' | null
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  size: 'sm'
})

/** Computed */
const badge = computed(() => POST_STATUS_BADGES[props.status])
</script>

<template>
  <UiBadge
    :variant="badge.variant"
    :size="props.size ?? undefined"
    :text="POST_STATUS_LABELS[props.status]"
    :icon-code="badge.iconCode ?? null"
    :icon-class="badge.iconClass ?? null"
  />
</template>
