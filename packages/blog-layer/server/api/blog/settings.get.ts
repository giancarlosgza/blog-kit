import type { ISettingsResponse } from '#blog/shared/types/api'
import { getFirestore } from 'firebase-admin/firestore'

/** Site-wide `settings/general` (branding + SEO defaults) for the layout, navbar and footer. */
export default defineCachedEventHandler(async (): Promise<ISettingsResponse> => {
  try {
    const snapshot = await getFirestore().collection('settings').doc('general').get()
    const data = snapshot.data()
    return { settings: data ? toSettings(data) : null }
  } catch (error) {
    failRead('settings', error)
  }
}, {
  name: 'blog-settings',
  maxAge: 300,
  swr: true,
  getKey: () => 'general'
})
