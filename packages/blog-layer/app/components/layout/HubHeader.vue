<script setup lang="ts">
import type { IBreadcrumbItem } from '@colorffy/ui'
import { NuxtLink } from '#components'

/** Interfaces */
interface IProps {
  title?: string
  titleId?: string
  description?: string
  breadcrumbs?: IBreadcrumbItem[]
}

/** Props */
const {
  title = '',
  titleId = undefined,
  description = '',
  breadcrumbs = []
} = defineProps<IProps>()

/** Composables */
const siteUrl = useSiteUrl()
</script>

<template>
  <div>
    <UiBreadcrumb
      v-if="breadcrumbs.length"
      :as="NuxtLink"
      :base-url="siteUrl"
      separator-icon="&#xe5cc;"
      :items="breadcrumbs"
      class="mb-4"
    />

    <header class="blog-hub-header">
      <div>
        <h1
          :id="titleId"
          class="blog-hub-title blog-display-1"
        >
          <slot name="title">
            {{ title }}
          </slot>
        </h1>
        <slot />
      </div>
      <div
        v-if="description || $slots.meta"
        class="blog-hub-meta"
      >
        <p
          v-if="description"
          class="subtitle-1 lh-md text-muted mb-0"
        >
          {{ description }}
        </p>
        <slot name="meta" />
      </div>
    </header>
  </div>
</template>
