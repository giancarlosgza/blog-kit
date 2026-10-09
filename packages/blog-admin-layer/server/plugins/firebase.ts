import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'

export default defineNitroPlugin((_nitroApp) => {
  // Skip firebase initialization during build/prerender
  if (import.meta.prerender) {
    return
  }

  // Initialize firebase for live server
  if (getApps().length === 0) {
    try {
      initializeApp({
        credential: applicationDefault()
      })
    } catch (error) {
      // A failed init means every authenticated endpoint will throw later at getApp() with an
      // opaque error. Surface it loudly and fail fast in production so a bad deploy is caught
      // immediately rather than silently serving 500s.
      console.log('[firebase-admin] FATAL: Admin SDK failed to initialize. Authenticated endpoints will not work.', error)
      if (!import.meta.dev) {
        throw error
      }
    }
  }
})
