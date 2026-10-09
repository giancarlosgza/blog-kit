import type { IPost } from '@giancarlosgza/blog-core'
import type { IPostListResponse } from '#blog/shared/types/api'

/** Interfaces */
type TPaginatedState<T extends IPostListResponse> = T & { page: number }

/** Appends a page, skipping posts already listed (a publish between pages shifts the window). */
export function appendPosts(current: IPost[], next: IPost[]): IPost[] {
  const seen = new Set(current.map(post => post.id))
  return [...current, ...next.filter(post => !seen.has(post.id))]
}

/**
 * A "load more" post list (tag and author pages) over a cached endpoint taking `?page=N`.
 * Page 1 renders on the server; each "load more" fetches the next page and appends it.
 */
export function usePaginatedPosts<T extends IPostListResponse>(key: string, url: string) {
  const { state, data, pending, error, ready } = useCachedResource<TPaginatedState<T>>(
    key,
    async () => ({ ...(await $fetch<T>(url)), page: 1 })
  )

  /** State */
  const isLoadingMore = ref(false)

  /** Computed */
  const posts = computed<IPost[]>(() => data.value?.posts ?? [])
  const hasMore = computed(() => data.value?.hasMore ?? false)

  /** Methods */
  async function loadMore(): Promise<void> {
    const current = state.value
    if (!current || !current.hasMore || isLoadingMore.value)
      return

    isLoadingMore.value = true
    try {
      const page = current.page + 1
      const next = await $fetch<T>(url, { query: { page } })
      state.value = { ...current, ...next, posts: appendPosts(current.posts, next.posts), page }
    } catch {
      // Keeps the loaded pages; the button stays available to retry.
    } finally {
      isLoadingMore.value = false
    }
  }

  return {
    data,
    posts,
    hasMore,
    pending: computed(() => pending.value || isLoadingMore.value),
    error,
    ready,
    loadMore
  }
}
