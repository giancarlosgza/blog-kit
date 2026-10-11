// The browser only receives public runtime config (NUXT_PUBLIC_*), so NUXT_BLOG_URL is copied into it per request
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const config = useRuntimeConfig(event)
    if (config.blogUrl)
      config.public.blogUrl = config.blogUrl
  })
})
