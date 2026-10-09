import type { H3Event } from 'h3'
import type { V2QueryResponse } from '#admin/shared/types/stats/plausible-v2'

/**
 * Resolves and sanitizes the Plausible API v1 and v2 base URLs.
 *
 * Handles cases where hot-reloaded environment variables might contain
 * mismatched or incomplete base URLs, performing self-healing automatically.
 *
 * @param {string} [v1ConfigUrl] - The raw Plausible v1 base URL from configuration.
 * @param {string} [v2ConfigUrl] - The raw Plausible v2 base URL from configuration.
 * @returns {{ v1BaseUrl: string, v2BaseUrl: string }} The sanitized and resolved v1 and v2 base URLs ending with slashes.
 * @throws 500 if both URLs are missing.
 */
export function resolvePlausibleUrls(v1ConfigUrl?: string, v2ConfigUrl?: string): { v1BaseUrl: string, v2BaseUrl: string } {
  let v1Base = v1ConfigUrl?.trim() || ''
  let v2Base = v2ConfigUrl?.trim() || ''

  if (!v1Base && !v2Base) {
    throw createError({ statusCode: 500, statusMessage: 'Analytics configuration unavailable.' })
  }

  // Self-heal: If v1Base actually contains the v2 query URL, swap/fix them.
  // This handles out-of-date environment variables in hot-reloaded dev processes.
  if (v1Base.includes('/v2/query/')) {
    if (!v2Base) {
      v2Base = v1Base
    }
    v1Base = v1Base.replace('/v2/query/', '/v1/stats/')
  }
  if (v2Base.includes('/v1/stats/')) {
    if (!v1Base) {
      v1Base = v2Base
    }
    v2Base = v2Base.replace('/v1/stats/', '/v2/query/')
  }

  // Fallbacks: if one is set but the other isn't
  if (v1Base && !v2Base) {
    if (v1Base.includes('/v1/stats/')) {
      v2Base = v1Base.replace('/v1/stats/', '/v2/query/')
    } else {
      v2Base = v1Base.endsWith('/') ? `${v1Base}v2/query/` : `${v1Base}/v2/query/`
    }
  } else if (v2Base && !v1Base) {
    if (v2Base.includes('/v2/query/')) {
      v1Base = v2Base.replace('/v2/query/', '/v1/stats/')
    } else {
      v1Base = v2Base.endsWith('/') ? `${v2Base}v1/stats/` : `${v2Base}/v1/stats/`
    }
  }

  if (!v1Base.endsWith('/'))
    v1Base += '/'
  if (!v2Base.endsWith('/'))
    v2Base += '/'

  return {
    v1BaseUrl: v1Base,
    v2BaseUrl: v2Base
  }
}

export interface PlausibleV2QueryBody {
  metrics: string[]
  date_range: string | [string, string]
  dimensions?: string[]
  filters?: unknown[]
  order_by?: [string, 'asc' | 'desc'][]
  pagination?: { limit?: number, offset?: number }
}

/**
 * Returns a v2 `query` caller bound to the configured site and token.
 *
 * @throws 503 when the token or the API base URL is missing.
 */
export function createPlausibleQuery(event: H3Event): (body: PlausibleV2QueryBody) => Promise<V2QueryResponse> {
  const config = useRuntimeConfig(event)
  const token = config.plausibleToken
  const { plausibleBaseUrl, plausibleBaseUrlV2 } = config.public
  const siteId = config.public.plausibleSiteId
  if (!token || !siteId || (!plausibleBaseUrl && !plausibleBaseUrlV2))
    throw createError({ statusCode: 503, statusMessage: 'Analytics is not configured.' })

  const { v2BaseUrl } = resolvePlausibleUrls(plausibleBaseUrl, plausibleBaseUrlV2)
  const url = v2BaseUrl.replace(/\/+$/, '')
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  return body => $fetch<V2QueryResponse>(url, { method: 'POST', headers, body: { site_id: siteId, ...body } })
}

/** Logs a failed Plausible call with Plausible's own reason (never the request headers) and returns that reason. */
export function logPlausibleFailure(err: unknown, label: string): string {
  const error = err as { data?: { error?: string }, statusCode?: number } | null
  const reason = (error?.data?.error || (error?.statusCode ? `HTTP ${error.statusCode}` : 'no response')).slice(0, 120)
  console.log(`Plausible analytics: ${label} failed: ${reason}`)
  return reason
}

/** Maps a failed Plausible call to a 503 the cards show as their error. */
export function plausibleUnavailable(err: unknown, label: string): Error {
  return createError({ statusCode: 503, statusMessage: `Analytics is unavailable right now (${logPlausibleFailure(err, label)}).` })
}
