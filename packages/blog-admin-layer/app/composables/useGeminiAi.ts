import type { IModelGroup } from '#admin/shared/models/gemini'

/**
 * Shared Gemini AI configuration and model initialization
 */
export function useGeminiAi() {
  const models: IModelGroup[] = [
    {
      name: 'Gemini 3.5',
      models: [
        { name: 'gemini-3.5-flash-lite', description: 'Gemini 3.5 Flash Lite' }
      ]
    },
    {
      name: 'Gemini 3.7',
      models: [
        { name: 'gemini-3.7-flash', description: 'Gemini 3.7 Flash' }
      ]
    },
    {
      name: 'Gemini 3.8',
      models: [
        { name: 'gemini-3.8-flash', description: 'Gemini 3.8 Flash' }
      ]
    }
  ]

  return {
    models
  }
}
