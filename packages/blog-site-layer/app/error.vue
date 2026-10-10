<script setup lang="ts">
import type { NuxtError } from '#app'

/** Props */
const props = defineProps({
  error: Object as () => NuxtError
})

/** Computed */
const errorText = computed(() => {
  const { statusText, message } = props.error ?? {}
  if (!message || message === statusText)
    return statusText

  return [statusText, message].filter(Boolean).join(' ')
})

/** Data */
const handleError = () => clearError({ redirect: '/' })
const { t } = useBlogLabels()
</script>

<template>
  <div class="d-flex flex-column justify-content-center dvh-100">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-12 text-center">
          <div class="mb-2">
            <UiIconMaterial
              v-if="error?.status === 404"
              icon-code="&#xf083;"
              class="iw-bold text-warning fs-5xl"
            />
            <UiIconMaterial
              v-else-if="error?.status === 500"
              icon-code="&#xe001;"
              class="iw-bold text-danger fs-5xl"
            />
            <UiIconMaterial
              v-else-if="error?.status === 503"
              icon-code="&#xe001;"
              class="iw-bold text-muted fs-5xl"
            />
            <UiIconMaterial
              v-else
              icon-code="&#xe001;"
              class="iw-bold text-muted fs-5xl"
            />
          </div>
          <div>
            <h1 class="text-heading heading-xl mb-1">
              {{ error?.status }}
            </h1>
            <h2 class="fs-lg font-secondary text-muted text-break">
              {{ errorText }}
            </h2>
          </div>
          <UiButtonGroup
            class="justify-content-center mt-section"
          >
            <UiButton
              variant="tonal"
              color="warning"
              class="btn-cta"
              :text="t('goHome')"
              @click="handleError"
            >
              <template #icon>
                <UiIconMaterial icon-code="&#xe5c4;" />
              </template>
            </UiButton>
          </UiButtonGroup>
        </div>
      </div>
    </div>
  </div>
</template>
