import type { ISafetyRating } from '#admin/shared/models/gemini'

/** Subset of the /api/ai/generate response the prompt composables consume. */
interface IGeminiTextResponse {
  text: string
  safetyRatings?: ISafetyRating[] | null
}
interface IGenerateOptions {
  modelName: string
  systemInstruction: string
  responseSchema?: Record<string, unknown>
  // Blog-only: long article rewrites need more output than the server default.
  maxOutputTokens?: number
}
interface IRunTaskOptions {
  loadingKey?: string
  disabled?: Readonly<Ref<boolean>>
  errorMessage?: string
}

/** Strips a leading "- " list marker from an AI response line. */
const regexListHyphen = /^-\s*/

/**
 * Shared Gemini plumbing for the prompt composables: loading/error state, the
 * /api/ai/generate fetch wrapper, response-line parsing, and a task runner that
 * centralizes the loading + error-handling boilerplate.
 */
export function useGeminiPrompt(loadingKeys: string[] = []) {
  const apiFetch = useApiFetch()

  const isLoading = ref(false)
  const loadingState = ref<Record<string, boolean>>(
    Object.fromEntries(loadingKeys.map(key => [key, false]))
  )
  const error = ref<string | null>(null)
  const errorSafetyRating = ref<ISafetyRating[] | null>(null)

  function resetErrors(): void {
    error.value = null
    errorSafetyRating.value = null
  }

  function parseSuggestionLines(text: string | null): string[] {
    if (!text)
      return []

    return text.split('\n').map(line => line.replace(regexListHyphen, '').trim()).filter(Boolean)
  }

  function generateAiText(prompt: unknown, options: IGenerateOptions): Promise<IGeminiTextResponse> {
    return apiFetch<IGeminiTextResponse>('/api/ai/generate', {
      method: 'POST',
      body: {
        prompt,
        modelName: options.modelName,
        systemInstruction: options.systemInstruction,
        ...(options.responseSchema && { responseSchema: options.responseSchema }),
        ...(options.maxOutputTokens && { maxOutputTokens: options.maxOutputTokens })
      }
    })
  }

  // JSON mode can still come back wrapped in a ```json fence, so strip it before parsing.
  async function generateAiJson<T>(prompt: unknown, options: IGenerateOptions & { responseSchema: Record<string, unknown> }): Promise<T> {
    const response = await generateAiText(prompt, options)
    const text = (response.text || '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
    return JSON.parse(text) as T
  }

  // Runs an async task with shared loading + error handling; skips when disabled.
  async function runTask(task: () => Promise<void>, options: IRunTaskOptions = {}): Promise<void> {
    if (options.disabled?.value)
      return

    resetErrors()
    isLoading.value = true
    if (options.loadingKey)
      loadingState.value[options.loadingKey] = true

    try {
      await task()
    } catch (err: any) {
      error.value = getAiErrorMessage(err, options.errorMessage)
      // $fetch puts the server's createError({ data }) under err.data.data.
      errorSafetyRating.value = err?.data?.data?.safetyRatings ?? err?.data?.safetyRatings ?? err?.safetyRatings ?? null
    } finally {
      isLoading.value = false
      if (options.loadingKey)
        loadingState.value[options.loadingKey] = false
    }
  }

  return {
    isLoading,
    loadingState,
    error,
    errorSafetyRating,
    resetErrors,
    parseSuggestionLines,
    generateAiText,
    generateAiJson,
    runTask
  }
}
