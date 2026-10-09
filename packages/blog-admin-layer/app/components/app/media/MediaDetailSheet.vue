<script setup lang="ts">
import type { IDialogDisplay } from '@colorffy/ui'
import type { IMediaFile, IMediaUsage } from '#admin/shared/models/media'
import { isImageFile, MEDIA_USAGE_KIND_LABELS, mediaExtension } from '#admin/app/utils/media-filters'
import { formatBytes } from '#admin/shared/utils/media'
import { NuxtLink } from '#components'

/** Interfaces */
interface IMediaDetailSheetProps {
  file?: IMediaFile | null
  usages?: IMediaUsage[]
  canDelete?: boolean
  isDeleting?: boolean
}
interface IMediaDetailSheetEmits {
  delete: [file: IMediaFile]
  copy: [url: string]
}

/** Props */
const props = withDefaults(defineProps<IMediaDetailSheetProps>(), {
  file: null,
  usages: () => [],
  canDelete: false,
  isDeleting: false
})

/** Emit */
const emit = defineEmits<IMediaDetailSheetEmits>()

/** Data */
const dialogRef = ref<IDialogDisplay | null>(null)
const usageIcons: Record<IMediaUsage['kind'], string> = {
  'post-cover': '&#xe3f4;',
  'post-body': '&#xef42;',
  'post-seo': '&#xe80d;',
  'author-photo': '&#xe7fd;',
  'logo': '&#xe98e;'
}

/** Composables */
const { formatTitleDate } = useDateFormat()

/** Computed */
const isInUse = computed<boolean>(() => props.usages.length > 0)
const statusText = computed<string>(() => isInUse.value ? 'In use, so it can’t be deleted' : 'Not used by any post, author or logo')
const specLine = computed<string>(() => props.file
  ? [mediaExtension(props.file), formatBytes(props.file.size), `${props.file.folder}/`].join(' · ')
  : '')
const hasPreview = computed<boolean>(() => Boolean(props.file?.url) && !!props.file && isImageFile(props.file))
const details = computed<{ label: string, value: string }[]>(() => props.file
  ? [
      { label: 'Updated', value: formatTitleDate(props.file.updated) || '-' },
      { label: 'Path', value: props.file.path },
      { label: 'Type', value: props.file.contentType || 'Unknown' },
      { label: 'Size', value: `${formatBytes(props.file.size)} (${props.file.size.toLocaleString('en-US')} bytes)` }
    ]
  : [])
const deleteHint = computed<string>(() => {
  if (!props.canDelete)
    return 'Only admins can delete files'
  return isInUse.value ? 'Remove it from every place it is used first' : 'Delete this file'
})

/** Methods */
function showDialog(): void {
  dialogRef.value?.showDialog()
}
function closeDialog(): void {
  dialogRef.value?.closeDialog()
}

defineExpose({
  showDialog,
  closeDialog
})
</script>

<template>
  <UiModal
    ref="dialogRef"
    mode="side-sheet"
    body-dialog-class="scroll-fade-block-effect"
    class="dialog-backdrop-blur media-sheet media-detail-sheet"
    aria-labelledby="media-detail-title"
    aria-describedby="media-detail-description"
  >
    <template #header>
      <div class="media-detail-heading">
        <h2
          id="media-detail-title"
          class="dialog-title fs-base fw-800 mb-0"
          :title="props.file?.name"
        >
          {{ props.file?.name ?? 'File details' }}
        </h2>
        <p
          id="media-detail-description"
          class="fs-3xs text-muted mb-0"
        >
          {{ statusText }}
        </p>
      </div>
      <UiButton
        variant="outline"
        title="Close file details"
        aria-label="Close file details"
        icon
        size="sm"
        @click="closeDialog"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5cd;" />
        </template>
      </UiButton>
    </template>
    <template #body>
      <div
        v-if="props.file"
        class="media-sheet-body"
      >
        <div class="media-detail-preview">
          <img
            v-if="hasPreview"
            :src="props.file.url!"
            :alt="props.file.name"
          >
          <UiIconMaterial
            v-else
            icon-code="&#xe3f4;"
            class="fs-3xl text-muted"
          />
        </div>
        <p class="font-code fs-3xs mb-0">
          {{ specLine }}
        </p>

        <dl class="media-detail-list">
          <div
            v-for="item in details"
            :key="item.label"
            class="media-detail-row"
          >
            <dt class="text-muted">
              {{ item.label }}
            </dt>
            <dd :title="item.value">
              {{ item.value }}
            </dd>
          </div>
        </dl>

        <div
          v-if="props.file.url"
          class="media-detail-url"
        >
          <UiInputText
            id="media-detail-url"
            :model-value="props.file.url"
            label="Download URL"
            size="sm"
            hide-label
            readonly
            class="mb-0"
          />
          <UiButton
            variant="tonal"
            color="secondary"
            size="sm"
            text="Copy"
            @click="emit('copy', props.file.url)"
          >
            <template #icon>
              <UiIconMaterial icon-code="&#xe14d;" />
            </template>
          </UiButton>
        </div>
        <UiAlert
          v-else
          type="tonal"
          variant="warning"
          size="sm"
          message="This file has no download token, so it has no public URL."
        />

        <section
          aria-labelledby="media-detail-usage"
          class="d-grid gap-2"
        >
          <div class="d-flex align-items-center gap-2">
            <UiSubheadingContent
              id="media-detail-usage"
              title="Used in"
              as="h3"
              gutter="none"
            />
            <UiBadge
              variant="outline"
              size="sm"
              :text="`${props.usages.length}`"
            />
          </div>
          <ul
            v-if="props.usages.length"
            class="media-usage-list"
          >
            <li
              v-for="usage in props.usages"
              :key="`${usage.kind}-${usage.id}`"
            >
              <NuxtLink
                :to="usage.editPath"
                class="media-usage-item"
              >
                <UiIconMaterial
                  :icon-code="usageIcons[usage.kind]"
                  class="media-usage-icon"
                />
                <span class="media-usage-title">{{ usage.title }}</span>
                <UiBadge
                  variant="outline"
                  size="sm"
                  :text="MEDIA_USAGE_KIND_LABELS[usage.kind]"
                />
                <UiIconMaterial
                  icon-code="&#xe5cc;"
                  class="fs-lg text-muted"
                />
              </NuxtLink>
            </li>
          </ul>
          <p
            v-else
            class="fs-3xs text-muted mb-0"
          >
            No post, author, logo or SEO image references this file.
          </p>
        </section>
      </div>
    </template>
    <template #footer>
      <UiButton
        v-if="props.file?.url"
        variant="outline"
        text="Open original"
        :href="props.file.url"
        target="_blank"
        rel="noopener"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe89e;" />
        </template>
      </UiButton>
      <UiButtonTooltip
        variant="tonal"
        color="danger"
        text="Delete"
        :tooltip-text="deleteHint"
        :disabled="!props.canDelete || isInUse || props.isDeleting"
        :loading="props.isDeleting"
        @click="props.file && emit('delete', props.file)"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe872;" />
        </template>
      </UiButtonTooltip>
    </template>
  </UiModal>
</template>
