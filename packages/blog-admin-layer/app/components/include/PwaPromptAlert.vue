<script setup lang="ts">
/** Composables */
const { $pwa } = useNuxtApp()
const admin = useAppConfig().admin

/** Data */
let offlineReadyTimer: ReturnType<typeof setTimeout> | undefined

/** Watch */
watch(() => $pwa?.offlineReady, (ready) => {
  if (!ready) {
    if (offlineReadyTimer) {
      clearTimeout(offlineReadyTimer)
    }
    return
  }
  if (offlineReadyTimer) {
    clearTimeout(offlineReadyTimer)
  }

  /* Auto dismiss the offline ready prompt after 3 seconds */
  offlineReadyTimer = setTimeout(() => {
    try {
      $pwa?.cancelPrompt?.()
    } catch (error) {
      console.log('PWA auto-dismiss offline prompt:', error)
    }
  }, 3000)
}, { immediate: true })

/** Lifecycle */
onBeforeUnmount(() => {
  if (offlineReadyTimer) {
    clearTimeout(offlineReadyTimer)
  }
})
</script>

<template>
  <ClientOnly
    fallback-tag="div"
    fallback="PWA Prompt"
  >
    <Transition
      mode="out-in"
      name="slide-block"
    >
      <!-- Update / Offline Ready -->
      <div
        v-if="$pwa?.offlineReady || $pwa?.needRefresh"
        class="pwa-alert-container"
        role="alert"
      >
        <div class="pwa-content">
          <UiIconMaterial
            :icon-code="$pwa?.offlineReady ? '&#xe90a;' : '&#xf000;'"
            :class="{ 'text-success': $pwa?.offlineReady }"
          />
          <div class="pwa-content-text-wrapper">
            <p class="subtitle-2">
              {{ $pwa?.offlineReady ? 'App ready to work offline.' : 'New content available, click on reload button to update.' }}
            </p>
          </div>
        </div>
        <div class="pwa-actions">
          <UiButton
            variant="text"
            class="text-neutral"
            text="Close"
            size="sm"
            @click="$pwa?.cancelPrompt()"
          />
          <UiButton
            v-if="$pwa?.needRefresh"
            variant="filled"
            text="Reload"
            rounded class="px-3"
            @click="$pwa?.updateServiceWorker()"
          />
        </div>
      </div>

      <!-- Install Prompt -->
      <div
        v-else-if="$pwa?.showInstallPrompt && !$pwa?.offlineReady && !$pwa?.needRefresh"
        class="pwa-alert-container"
        role="alert"
      >
        <div class="pwa-content">
          <IncludeAppLogo
            type="icon"
            :width="40"
            :height="40"
            custom-class="img-avatar avatar-navbar img-fit-contain rounded-sm"
          />
          <div class="pwa-content-text-wrapper">
            <p class="subtitle-1">
              Install {{ admin.name }}
            </p>
            <p class="subtitle-2">
              Get our app — manage posts, authors and settings.
            </p>
          </div>
        </div>
        <div class="pwa-actions">
          <UiButton
            variant="text"
            class="text-neutral"
            text="Not now"
            size="sm"
            @click="$pwa.cancelInstall()"
          />
          <UiButton
            variant="filled"
            text="Install"
            rounded class="px-3"
            @click="$pwa.install()"
          />
        </div>
      </div>
    </Transition>
  </ClientOnly>
</template>
