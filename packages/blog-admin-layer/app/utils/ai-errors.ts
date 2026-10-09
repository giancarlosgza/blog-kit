/**
 * Maps an AI request error to user-facing copy, hiding raw fetch/server output
 * (e.g. `[POST] "/api/ai/generate": 500 ...`).
 */
export function getAiErrorMessage(err: any, fallback = 'AI generation failed. Please try again in a moment.'): string {
  const status = err?.statusCode ?? err?.response?.status ?? err?.status

  switch (status) {
    case 401:
      return 'Your admin session expired. Sign in again to use AI features.'
    case 403:
      return 'Admin access is required to use AI features.'
    case 400:
    case 413:
      return 'Your prompt could not be processed. Try a shorter or different description.'
    case 422:
      // Safety block: the server message explains how to recover.
      return err?.data?.statusMessage ?? 'Your prompt was blocked by safety filters. Change the description and try again.'
    default:
      return fallback
  }
}
