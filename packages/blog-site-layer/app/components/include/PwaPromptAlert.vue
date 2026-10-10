<script setup lang="ts">
/** Composables */
const { $pwa } = useNuxtApp()
const brand = useAppConfig().blog
const { t } = useBlogLabels()

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

  offlineReadyTimer = setTimeout(() => {
    try {
      $pwa?.cancelPrompt?.()
    } catch (error) {
      console.log('PWA auto-dismiss offline prompt:', error)
    }
  }, 2000)
}, { immediate: true })

/** Lifecycle */
onBeforeUnmount(() => {
  if (offlineReadyTimer) {
    clearTimeout(offlineReadyTimer)
  }
})
</script>

<template>
  <ClientOnly>
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
          <div>
            <UiIconMaterial
              :icon-code="$pwa?.offlineReady ? '&#xe86c;' : '&#xf000;'"
              :class="{ 'text-success': $pwa?.offlineReady }"
              class="icon-wrap icon-wrap-xs fs-base text-on-body bg-success-fixed bg-opacity-20"
            />
          </div>
          <div class="pwa-content-text-wrapper">
            <p
              class="subtitle-2 text-on-body fw-500"
              :title="$pwa?.offlineReady ? '' : t('reloadForUpdates')"
            >
              {{ $pwa?.offlineReady ? t('appUpdated') : t('updateAvailable') }}
            </p>
          </div>
        </div>
        <div class="pwa-actions">
          <UiButton
            v-if="$pwa?.needRefresh"
            variant="filled"
            :text="t('reload')"
            size="sm"
            class="text-neutral"
            rounded
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
            :width="40"
            :height="40"
            type="icon"
            loading="lazy"
            custom-class="img-avatar avatar-navbar img-fit-contain rounded-sm"
          />
          <div class="pwa-content-text-wrapper">
            <p class="subtitle-1">
              {{ t('installApp', { name: brand.shortName }) }}
            </p>
            <p class="subtitle-2">
              {{ brand.pwa.installDescription || t('installDescription') }}
            </p>
          </div>
        </div>
        <div class="pwa-actions">
          <UiButton
            variant="text"
            class="text-neutral"
            :text="t('notNow')"
            size="sm"
            rounded
            @click="$pwa.cancelInstall()"
          />
          <UiButton
            variant="filled"
            :text="t('install')"
            size="sm"
            rounded class="px-3"
            @click="$pwa.install()"
          />
        </div>
      </div>
    </Transition>
  </ClientOnly>
</template>
