import type { IPost, IPostEvent, IPostReview, PostStatus } from '#admin/shared/models/post'

/** Workflow fields returned by every `/api/posts/*` workflow route. */
export interface IPostWorkflowResponse {
  ok: boolean
  slug: string
  status: PostStatus
  isPublished: boolean
  publishAt: number | null
  review: IPostReview | null
}

/** Patches a post with a route response; cleared fields are dropped rather than set to null. */
export function applyWorkflowResponse<T extends IPost>(post: T, response: IPostWorkflowResponse): T {
  const next = { ...post, status: response.status, isPublished: response.isPublished } as T
  if (response.publishAt)
    next.publishAt = response.publishAt
  else
    delete next.publishAt
  if (response.review)
    next.review = response.review
  else
    delete next.review
  return next
}

/** Pulls the route's statusMessage out of a $fetch error. */
export function workflowErrorMessage(err: unknown, fallback: string): string {
  const error = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string } | null
  return error?.data?.statusMessage || error?.statusMessage || error?.message || fallback
}

/**
 * Editorial workflow calls. Status changes always go through these server routes (the rules
 * stop editors from writing `status`/`isPublished`), and each one records a history event.
 */
export function usePostWorkflow() {
  const apiFetch = useApiFetch()
  const pending = ref<string | null>(null)

  async function call(action: string, body: Record<string, unknown>): Promise<IPostWorkflowResponse> {
    pending.value = action
    try {
      return await apiFetch<IPostWorkflowResponse>(`/api/posts/${action}`, { method: 'POST', body })
    } finally {
      pending.value = null
    }
  }

  return {
    pending: readonly(pending),
    submit: (slug: string, note?: string) => call('submit', { slug, note }),
    withdraw: (slug: string) => call('withdraw', { slug }),
    requestChanges: (slug: string, note: string, reasons: string[]) => call('request-changes', { slug, note, reasons }),
    resolve: (slug: string) => call('resolve', { slug }),
    /** Publishes now, or schedules when `publishAt` (Unix ms) is given. */
    publish: (slug: string, publishAt?: number | null) => call('publish', { slug, ...(publishAt ? { publishAt } : {}) }),
    unpublish: (slug: string) => call('unpublish', { slug }),
    fetchEvents: (slug: string) => apiFetch<{ slug: string, events: IPostEvent[] }>(`/api/posts/${encodeURIComponent(slug)}/events`)
  }
}
