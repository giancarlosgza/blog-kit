<script setup lang="ts">
import type { IBlogLink } from '#blog-site/app/app.config'
import { NuxtLink } from '#components'

/** Composables */
const brand = useAppConfig().blog
const { blogName, blogDescription } = useBlogBrand()
const appVersion = useAppVersion()
const { blogPath } = useBlogPath()

/** State */
const showCookiesBanner = useState<boolean>('show-cookies-banner', () => false)

/** Computed */
const footerLinks = computed((): IBlogLink[] => brand.footerLinks)
const currentYear = computed(() => new Date().getFullYear())

/** Methods */
function openCookiesBanner(): void {
  showCookiesBanner.value = true
}
function handleCookiesBannerKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openCookiesBanner()
  }
}
</script>

<template>
  <UiFooter aria-label="Site footer">
    <!-- Brand -->
    <template #brand>
      <p class="subtitle-1 fw-600 mb-1">
        {{ blogName }}
      </p>
      <p
        v-if="blogDescription"
        class="subtitle-2 text-muted mb-0"
      >
        {{ blogDescription }}
      </p>
    </template>

    <!-- Links -->
    <nav aria-label="Footer">
      <UiFooterGroup title="Blog">
        <UiFooterItem
          :as="NuxtLink"
          :to="{ name: 'blog' }"
          text="Articles"
        />
        <UiFooterItem
          :href="blogPath('/rss.xml')"
          text="RSS"
        />
        <template
          v-for="link in footerLinks"
          :key="link.text"
        >
          <UiFooterItem
            v-if="link.to"
            :as="NuxtLink"
            :to="link.to"
            :text="link.text"
          />
          <UiFooterItem
            v-else
            :href="link.href"
            :text="link.text"
          />
        </template>
      </UiFooterGroup>
    </nav>

    <!-- Bottom -->
    <template #bottom>
      <nav
        class="d-flex flex-wrap gap-3"
        aria-label="Legal information"
      >
        <UiFooterItem
          v-if="brand.legal.cookiesUrl"
          :href="brand.legal.cookiesUrl"
          text="Cookies"
        />
        <UiFooterItem
          text="Cookie Settings"
          role="button"
          tabindex="0"
          aria-label="Manage cookie settings"
          @click="openCookiesBanner"
          @keydown="handleCookiesBannerKeydown"
        />
      </nav>
      <p class="caption text-muted mb-0">
        &copy;{{ currentYear }} {{ blogName }} v{{ appVersion }}
      </p>
    </template>
  </UiFooter>
</template>
