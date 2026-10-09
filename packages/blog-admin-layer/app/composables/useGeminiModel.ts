import type { IHarmonyGemini } from '#admin/shared/models/gemini'
import { useLocalStorage } from '@vueuse/core'
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS } from '#admin/shared/models/gemini'

/** Constants */
const MODEL_STORAGE_KEY = 'blog-admin:gemini-model'

function isGeminiModel(value: unknown): value is IHarmonyGemini {
  return typeof value === 'string' && (GEMINI_MODELS as readonly string[]).includes(value)
}

/**
 * Gemini model shared by every AI surface (post editor).
 * useState keeps them in sync while navigating; localStorage restores the pick on reload.
 */
export function useGeminiModel() {
  const storedModel = useLocalStorage<string>(MODEL_STORAGE_KEY, DEFAULT_GEMINI_MODEL)
  const model = useState<IHarmonyGemini>('gemini-model', () => DEFAULT_GEMINI_MODEL)

  // The server has no localStorage, so the saved pick is restored on the client.
  // A stored model that was removed from the list is ignored.
  if (import.meta.client && isGeminiModel(storedModel.value) && storedModel.value !== model.value)
    model.value = storedModel.value

  return computed<IHarmonyGemini>({
    get: () => model.value,
    set: (value) => {
      model.value = value
      storedModel.value = value
    }
  })
}
