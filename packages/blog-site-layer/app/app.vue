<script setup lang="ts">
/** Composables */
const runtimeConfig = useRuntimeConfig()
const brand = useAppConfig().blog
const siteUrl = useSiteUrl()
const { blogPath } = useBlogPath()

/** Head */
useHead({
  titleTemplate: `%s | ${brand.name}`,
  link: [{ rel: 'alternate', type: 'application/rss+xml', title: brand.name, href: blogPath('/rss.xml') }]
})

/** Site-wide Organization + WebSite structured data */
useSiteSchemaLd()

/** Analytics Scripts */
const plausibleEndpoint = computed(() => {
  const scriptUrl = runtimeConfig.public.plausibleScript
  if (!scriptUrl)
    return undefined

  return scriptUrl.replace(/\/js\/.*\.js$/, '/api/event')
})
useScriptPlausibleAnalytics({
  domain: String(runtimeConfig.public.plausibleDomain || new URL(siteUrl).host),
  endpoint: plausibleEndpoint.value,
  scriptInput: {
    src: runtimeConfig.public.plausibleScript
  }
})
</script>

<template>
  <div>
    <NuxtPwaAssets />
    <NuxtLoadingIndicator :color="brand.loadingColor" />

    <NuxtLayout>
      <NuxtPage />

      <IncludeCookiesBanner />
    </NuxtLayout>
  </div>
</template>
