import type { ISettings } from '@giancarlosgza/blog-core'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

/** Read/write the site-wide `settings/general` document (admin only). */
export function useBlogSettings() {
  const db = useFirestore()
  const settings = ref<ISettings | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)

  async function loadSettings() {
    isLoading.value = true
    try {
      const snap = await getDoc(doc(db, 'settings', 'general'))
      settings.value = snap.exists() ? (snap.data() as ISettings) : null
    } finally {
      isLoading.value = false
    }
  }

  async function saveSettings(data: Partial<ISettings>) {
    isSaving.value = true
    try {
      await setDoc(doc(db, 'settings', 'general'), { ...data }, { merge: true })
      settings.value = { ...(settings.value ?? {} as ISettings), ...data }
    } finally {
      isSaving.value = false
    }
  }

  return { settings, isLoading, isSaving, loadSettings, saveSettings }
}
