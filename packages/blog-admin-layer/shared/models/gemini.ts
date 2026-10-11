import type { HarmCategory } from 'firebase/ai'

export interface IModelItem {
  name: string
  description: string
}
export interface IModelGroup {
  name: string
  models: IModelItem[]
}

export const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'] as const
export type IHarmonyGemini = typeof GEMINI_MODELS[number]
/** Default model used across every AI surface (client and server). */
export const DEFAULT_GEMINI_MODEL: IHarmonyGemini = 'gemini-3.8-flash'

export interface ISafetyRating {
  category: HarmCategory
  probability: string
  blocked: boolean
}
export interface IGeminiResponse {
  text: string | undefined
  safetyRatings: ISafetyRating[] | null
  usageMetadata: { promptTokenCount?: number, candidatesTokenCount?: number, totalTokenCount?: number } | null
  modelVersion: string | null
  finishReason: string | null
}
