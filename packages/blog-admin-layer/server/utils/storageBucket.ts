import type { H3Event } from 'h3'
import { getApp } from 'firebase-admin/app'

/**
 * The Storage bucket the admin uploads into. The Admin app is initialized without a bucket,
 * so fall back to the client Firebase config (`NUXT_PUBLIC_VUEFIRE_CONFIG_STORAGE_BUCKET`).
 */
export function resolveStorageBucket(event: H3Event): string | null {
  const fromApp = getApp().options.storageBucket
  const fromConfig = (useRuntimeConfig(event).public.vuefire as { config?: { storageBucket?: string } } | undefined)?.config?.storageBucket
  return fromApp || fromConfig || null
}
