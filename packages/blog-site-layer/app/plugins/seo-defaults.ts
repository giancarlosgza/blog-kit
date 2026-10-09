export default defineNuxtPlugin(() => {
  useSeoMeta({
    twitterCard: 'summary_large_image',
    ogSiteName: useAppConfig().blog.name
  })
})
