<script setup lang="ts">
/** Props */
defineProps({
  error: Object as () => IError | null
})

/** Interfaces */
interface IError {
  statusCode?: number | undefined
  statusMessage?: string | undefined
  message?: string | undefined
}

/** Data */
const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="d-flex flex-column justify-content-center dvh-100">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-12 text-center">
          <div class="mb-2">
            <UiIconMaterial
              v-if="error?.statusCode === 404"
              icon-code="&#xf083;"
              class="iw-bold text-warning fs-5xl"
            />
            <UiIconMaterial
              v-else-if="error?.statusCode === 500"
              icon-code="&#xe001;"
              class="iw-bold text-danger fs-5xl"
            />
            <UiIconMaterial
              v-else-if="error?.statusCode === 503"
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
              {{ error?.statusCode }}
            </h1>
            <h2 class="fs-lg font-secondary text-muted">
              {{ error?.message }}
            </h2>
          </div>

          <UiButtonGroup class="justify-content-center mt-section mt-section-md">
            <UiButton
              variant="tonal"
              color="warning"
              class="btn-cta"
              text="Go home"
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
