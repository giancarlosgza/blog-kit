interface ISyncTagCountsResponse {
  ok: boolean
  updated: number
  totalTags: number
}

/**
 * Triggers the server-side tag count sync (`POST /api/tags/sync`), which recomputes
 * each tag's post count from the `posts` collection. Server-backed so the heavy
 * read/batch-write runs with the Admin SDK rather than in the browser.
 */
export function useSyncTagCounts() {
  const apiFetch = useApiFetch()

  const isSyncing = ref<boolean>(false)
  const error = ref<Error | null>(null)

  async function syncTagCounts(): Promise<ISyncTagCountsResponse> {
    isSyncing.value = true
    error.value = null
    try {
      return await apiFetch<ISyncTagCountsResponse>('/api/tags/sync', { method: 'POST' })
    } catch (err: unknown) {
      const errObj = err instanceof Error ? err : new Error(String(err))
      error.value = errObj
      throw errObj
    } finally {
      isSyncing.value = false
    }
  }

  return { isSyncing, error, syncTagCounts }
}
