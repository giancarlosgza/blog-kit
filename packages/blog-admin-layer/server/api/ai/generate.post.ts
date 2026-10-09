import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai'
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS } from '#admin/shared/models/gemini'

const ALLOWED_MODELS = GEMINI_MODELS
// Article bodies can be long, so allow a much larger prompt than the admin (short changelog) route.
const MAX_PROMPT_LENGTH = 24000
const MAX_INSTRUCTION_LENGTH = 4000
const MAX_SCHEMA_LENGTH = 4000
const DEFAULT_MAX_OUTPUT_TOKENS = 2048
const MIN_OUTPUT_TOKENS = 256
const MAX_OUTPUT_TOKENS_CAP = 8192

/** The admin's own origin (`public.siteUrl`); any origin in dev. */
function isAllowedOrigin(origin: string, siteUrl = ''): boolean {
  if (import.meta.dev)
    return true
  try {
    return new URL(siteUrl).origin === origin
  } catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  // Same-origin enforcement: requests from unknown origins are rejected before any auth check.
  // The origin header is absent on same-origin requests (e.g. SSR $fetch), so absence is allowed.
  const origin = getHeader(event, 'origin')
  if (origin && !isAllowedOrigin(origin, useRuntimeConfig(event).public.siteUrl)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  await requireStaff(event)

  const config = useRuntimeConfig(event)

  const body = await readBody(event)
  const { modelName = DEFAULT_GEMINI_MODEL, systemInstruction, prompt, responseSchema, maxOutputTokens } = body

  // prompt can be a plain string (text-only) or an array of parts (multimodal: image + text).
  // The Gemini SDK's `contents` field natively accepts both shapes.
  const isStringPrompt = typeof prompt === 'string'
  const isArrayPrompt = Array.isArray(prompt) && prompt.length > 0

  if (!prompt || (!isStringPrompt && !isArrayPrompt)) {
    throw createError({ statusCode: 400, statusMessage: 'Prompt is required' })
  }

  if (isStringPrompt && (prompt.trim().length === 0 || prompt.length > MAX_PROMPT_LENGTH)) {
    throw createError({ statusCode: 400, statusMessage: isStringPrompt && prompt.trim().length === 0 ? 'Prompt is required' : 'Prompt exceeds maximum allowed length' })
  }

  if (systemInstruction !== undefined && (typeof systemInstruction !== 'string' || systemInstruction.length > MAX_INSTRUCTION_LENGTH)) {
    throw createError({ statusCode: 400, statusMessage: 'System instruction is invalid or too long' })
  }

  // Optional JSON mode: a plain-object schema switches the response to application/json.
  const hasResponseSchema = responseSchema !== undefined
  if (hasResponseSchema && (typeof responseSchema !== 'object' || responseSchema === null || Array.isArray(responseSchema) || JSON.stringify(responseSchema).length > MAX_SCHEMA_LENGTH)) {
    throw createError({ statusCode: 400, statusMessage: 'Response schema is invalid or too large' })
  }

  // Unknown model names fall back to the default instead of erroring, to avoid breaking
  // the UI if a model is removed from the client list but a cached request still sends it.
  const safeModelName: string = ALLOWED_MODELS.includes(modelName) ? modelName : DEFAULT_GEMINI_MODEL

  // Clamp the optional token override so "improve writing" can return a full article body.
  const safeMaxOutputTokens = typeof maxOutputTokens === 'number' && Number.isFinite(maxOutputTokens)
    ? Math.min(Math.max(Math.trunc(maxOutputTokens), MIN_OUTPUT_TOKENS), MAX_OUTPUT_TOKENS_CAP)
    : DEFAULT_MAX_OUTPUT_TOKENS

  if (!config.geminiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Internal server error: AI is not properly configured.' })
  }

  const ai = new GoogleGenAI({ apiKey: config.geminiKey })

  const generationConfig = {
    temperature: 1,
    topK: 1,
    topP: 1,
    maxOutputTokens: safeMaxOutputTokens,
    responseMimeType: hasResponseSchema ? 'application/json' : 'text/plain',
    ...(hasResponseSchema && { responseSchema }),
    systemInstruction
  }

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
  ]

  try {
    const result = await ai.models.generateContent({
      model: safeModelName,
      contents: prompt,
      config: {
        ...generationConfig,
        safetySettings
      }
    })

    return {
      text: result.text,
      safetyRatings: result.candidates?.[0]?.safetyRatings || null,
      usageMetadata: result.usageMetadata ?? null,
      modelVersion: result.modelVersion ?? null,
      finishReason: result.candidates?.[0]?.finishReason ?? null
    }
  } catch (error: any) {
    console.log('AI generation error:', error)

    const safetyRatings = error?.safetyRatings ?? null
    if (Array.isArray(safetyRatings) && safetyRatings.some((rating: any) => rating?.blocked)) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Your prompt was blocked by safety filters. Change the description and try again.',
        data: { safetyRatings }
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'AI generation failed. Please try again in a moment.',
      data: { safetyRatings }
    })
  }
})
