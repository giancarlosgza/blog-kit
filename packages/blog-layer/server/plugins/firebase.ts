import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'

/**
 * Default Admin SDK app for server routes: the cached public read endpoints.
 */
export default defineNitroPlugin(() => {
  // Skip firebase initialization during build/prerender
  if (import.meta.prerender)
    return

  if (getApps().some(app => app.name === '[DEFAULT]'))
    return

  try {
    initializeApp({ credential: applicationDefault() })
  } catch (error) {
    // Unlike blog-admin, a failed init must not crash the server: reads then answer 503 (never cached).
    console.log('[firebase-admin] Admin SDK failed to initialize. Blog data will not load.', error)
  }
})
