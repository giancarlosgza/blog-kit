<script setup lang="ts">
import type { IBlogLink } from '#blog-site/app/app.config'
import { NuxtLink } from '#components'

/** Composables */
const brand = useAppConfig().blog
const { blogName } = useBlogBrand()
const { settings } = useBlogSettings()
const { t } = useBlogLabels()

/** Computed */
const logoUrl = computed(() => settings.value?.logoURL || '')
const navLinks = computed((): IBlogLink[] => brand.navLinks)
</script>

<template>
  <UiNavbar
    sticky
    data-allow-mismatch
  >
    <!-- Brand -->
    <UiNavbarTitle>
      <template #brand>
        <UiNavbarBrand
          :as="NuxtLink"
          :to="{ name: 'blog' }"
        >
          <template #link="{ linkTarget }">
            <NuxtLink
              :to="linkTarget"
              :aria-label="`${blogName} homepage`"
              class="d-inline-flex align-items-center gap-2 fw-600"
            >
              <NuxtImg
                v-if="logoUrl"
                :src="logoUrl"
                alt=""
                width="28"
                height="28"
                preset="logo"
                class="img-fit-contain rounded-sm"
              />
              {{ blogName }}
            </NuxtLink>
          </template>
        </UiNavbarBrand>
      </template>
    </UiNavbarTitle>

    <!-- Mobile -->
    <UiNavbarMobileMenu>
      <LazyIncludeColorModePicker :show-labels="false" />
    </UiNavbarMobileMenu>

    <!-- Desktop -->
    <UiNavbarCollapse>
      <UiNavbarNav position="end">
        <UiNavbarLink
          :as="NuxtLink"
          :to="{ name: 'blog' }"
          :text="t('articles')"
        />
        <template
          v-for="link in navLinks"
          :key="link.text"
        >
          <UiNavbarLink
            v-if="link.to"
            :as="NuxtLink"
            :to="link.to"
            :text="link.text"
          />
          <UiNavbarLink
            v-else
            :href="link.href"
            :text="link.text"
            target="_blank"
            rel="noopener"
          />
        </template>
        <UiNavbarItem>
          <LazyIncludeColorModePicker :show-labels="false" />
        </UiNavbarItem>
      </UiNavbarNav>
    </UiNavbarCollapse>
  </UiNavbar>
</template>
