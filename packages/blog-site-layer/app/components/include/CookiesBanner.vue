<script setup lang="ts">
import type { AlertVariant } from '@colorffy/ui'

/** Interfaces */
interface ICookiesBannerContent {
  message: string
  acceptButtonText: string
  rejectButtonText: string
  policyLinkText: string
  variant: AlertVariant
  storageKey: string
  rejectedStorageKey: string
}
interface ICookiesBannerProps {
  autoShow?: boolean
  variant?: AlertVariant
}

/** Props */
const {
  autoShow = true,
  variant = 'success'
} = defineProps<ICookiesBannerProps>()

/** Emit */
const emit = defineEmits<{
  onAcceptCookies: [accepted: boolean]
  onRejectCookies: [rejected: boolean]
}>()

/** Composables */
const brand = useAppConfig().blog

/** Data */
const content: ICookiesBannerContent = {
  message: 'We use cookies to make your experience better. To learn more, {policyLink}.',
  acceptButtonText: 'Accept',
  rejectButtonText: 'Reject',
  policyLinkText: 'check out our policy',
  variant,
  storageKey: 'cookies:accept',
  rejectedStorageKey: 'cookies:reject'
}

const isCookiesAccepted = useLocalStorage(content.storageKey, false)
const isCookiesRejected = useLocalStorage(content.rejectedStorageKey, false)
const showCookiesBanner = useState<boolean>('show-cookies-banner', () => false)

/** Methods */
function onAcceptCookies() {
  isCookiesAccepted.value = true
  isCookiesRejected.value = false
  showCookiesBanner.value = false
}
function onRejectCookies() {
  isCookiesAccepted.value = false
  isCookiesRejected.value = true
  showCookiesBanner.value = false
  emit('onRejectCookies', true)
}

/** Lifecycle */
onMounted(() => {
  if (!autoShow)
    return

  if (!isCookiesAccepted.value && !isCookiesRejected.value) {
    showCookiesBanner.value = true
  } else if (isCookiesAccepted.value) {
    emit('onAcceptCookies', true)
  }
})

/** Watch */
watch(isCookiesAccepted, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    emit('onAcceptCookies', newValue)
  }
}, { immediate: false })
</script>

<template>
  <UiAlert
    v-show="showCookiesBanner"
    type="snackbar"
    :variant="variant"
    size="sm"
    aria-label="Cookie consent banner"
  >
    <template #content>
      <span>
        We use cookies to make your experience better.<template v-if="brand.legal.cookiesUrl">
          To learn more,
          <NuxtLink
            :to="brand.legal.cookiesUrl"
            class="text-link"
            target="_blank"
            external
            no-prefetch
            rel="noopener"
            :aria-label="`View ${content.policyLinkText} - opens in new tab`"
          >
            {{ content.policyLinkText }}
          </NuxtLink>.
        </template>
      </span>
    </template>
    <template #actions>
      <UiButtonGroup class="gap-1 mt-2 mt-sm-0">
        <UiButton
          variant="text"
          size="sm"
          :text="content.rejectButtonText"
          :aria-label="`${content.rejectButtonText} cookies and close this banner`"
          rounded
          @click="onRejectCookies"
        />
        <UiButton
          variant="tonal"
          color="neutral"
          size="sm"
          :text="content.acceptButtonText"
          :aria-label="`${content.acceptButtonText} cookies and close this banner`"
          rounded
          @click="onAcceptCookies"
        />
      </UiButtonGroup>
    </template>
  </UiAlert>
</template>
