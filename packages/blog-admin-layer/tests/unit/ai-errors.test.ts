import { describe, expect, it } from 'vitest'
import { getAiErrorMessage } from '#admin/app/utils/ai-errors'

describe('getAiErrorMessage', () => {
  it('maps auth errors to sign-in and access copy', () => {
    expect(getAiErrorMessage({ statusCode: 401 })).toMatch(/session expired/)
    expect(getAiErrorMessage({ response: { status: 403 } })).toMatch(/access is required/)
  })

  it('maps bad or oversized prompts to one message', () => {
    expect(getAiErrorMessage({ status: 400 })).toBe(getAiErrorMessage({ status: 413 }))
    expect(getAiErrorMessage({ status: 413 })).toMatch(/could not be processed/)
  })

  it('uses the server message for safety blocks when present', () => {
    expect(getAiErrorMessage({ statusCode: 422, data: { statusMessage: 'Blocked: harassment' } })).toBe('Blocked: harassment')
    expect(getAiErrorMessage({ statusCode: 422 })).toMatch(/safety filters/)
  })

  it('hides raw errors behind the fallback', () => {
    expect(getAiErrorMessage(new Error('[POST] "/api/ai/generate": 500'))).toMatch(/AI generation failed/)
    expect(getAiErrorMessage({ statusCode: 500 }, 'Custom fallback')).toBe('Custom fallback')
  })
})
