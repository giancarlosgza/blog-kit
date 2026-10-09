import type { IPost } from '#blog/shared/models/post'
import type { IFeaturedPostsResponse, IPostListResponse, ITagsResponse } from '#blog/shared/types/api'

/** Interfaces */
interface IPostFeedState extends IPostListResponse {
  page: number
}

/**
 * Home hero posts: the featured ones when any exist, else the latest post.
 * `featured` comes from `/api/blog/featured` (already published-only, ordered and capped).
 */
export function homeHeroPosts(featured: IPost[], latest: IPost[]): IPost[] {
  if (featured.length)
    return featured
  return latest.slice(0, 1)
}

/** `posts` without the ones already shown in the hero. */
export function excludePosts(posts: IPost[], shown: IPost[]): IPost[] {
  if (!shown.length)
    return posts
  const ids = new Set(shown.map(post => post.id))
  return posts.filter(post => !ids.has(post.id))
}

/**
 * Home post feed: published posts (newest first) with a `?tag=` synced filter,
 * incremental "load more" pagination, the featured hero posts and the popularity-ordered tag list.
 *
 * Reads the cached `/api/blog/posts` (tag filtered server-side, so `?tag=` is a real server render)
 * and `/api/blog/tags`. Feeds are kept per tag in one `post-feed` state: the server only fills the
 * requested one, and switching back to a loaded tag on the client reuses it.
 */
export function usePostFeed() {
  const route = useRoute()
  const router = useRouter()

  /** Tag filter */
  const selectedTag = computed<string | null>({
    get: () => route.query.tag?.toString() || null,
    set: (value) => {
      router.push({ query: { ...route.query, tag: value || undefined } })
    }
  })

  /** Tags */
  const { data: tagsData } = useCachedResource<ITagsResponse>('blog-tags', () => $fetch<ITagsResponse>('/api/blog/tags'))
  const tags = computed(() => tagsData.value?.tags ?? [])

  /** Featured (a failed read falls back to the latest post) */
  const { data: featuredData, ready: featuredReady } = useCachedResource<IFeaturedPostsResponse>(
    'blog-featured',
    () => $fetch<IFeaturedPostsResponse>('/api/blog/featured')
  )

  /** Posts */
  const feeds = useState<Record<string, IPostFeedState>>('post-feed', () => ({}))
  const isLoadingMore = ref(false)
  const error = ref<unknown>(null)
  const feedKey = computed(() => (selectedTag.value ? `tag:${selectedTag.value}` : 'all'))
  const feed = computed<IPostFeedState | undefined>(() => feeds.value[feedKey.value])

  function fetchPage(tag: string | null, page: number): Promise<IPostListResponse> {
    return $fetch<IPostListResponse>('/api/blog/posts', { query: { page, tag: tag || undefined } })
  }

  async function loadFeed(key: string, tag: string | null): Promise<void> {
    try {
      const response = await fetchPage(tag, 1)
      feeds.value = { ...feeds.value, [key]: { ...response, page: 1 } }
    } catch (loadError) {
      error.value = loadError
      feeds.value = { ...feeds.value, [key]: { posts: [], hasMore: false, page: 1 } }
    }
  }

  let feedReady: Promise<unknown> = Promise.resolve()
  if (import.meta.server) {
    // useAsyncData blocks SSR until the fetch resolves, so the filled state is serialized.
    feedReady = useAsyncData(`post-feed-${feedKey.value}`, async () => {
      if (!feed.value)
        await loadFeed(feedKey.value, selectedTag.value)
      return true
    })
  } else {
    watch(feedKey, (key) => {
      if (!feeds.value[key])
        loadFeed(key, selectedTag.value)
    }, { immediate: true })
  }

  /** Computed */
  const posts = computed<IPost[]>(() => feed.value?.posts ?? [])
  const pending = computed(() => !feed.value || isLoadingMore.value)
  const hasMore = computed(() => feed.value?.hasMore ?? false)
  const heroPosts = computed<IPost[]>(() =>
    selectedTag.value ? [] : homeHeroPosts(featuredData.value?.posts ?? [], posts.value)
  )
  const featuredPost = computed<IPost | null>(() => heroPosts.value[0] ?? null)
  const secondaryFeaturedPosts = computed<IPost[]>(() => heroPosts.value.slice(1))
  const gridPosts = computed(() => excludePosts(posts.value, heroPosts.value))

  /** Methods */
  async function loadMore(): Promise<void> {
    const key = feedKey.value
    const current = feeds.value[key]
    if (!current || !current.hasMore || isLoadingMore.value)
      return

    isLoadingMore.value = true
    try {
      const page = current.page + 1
      const response = await fetchPage(selectedTag.value, page)
      feeds.value = {
        ...feeds.value,
        [key]: { posts: appendPosts(current.posts, response.posts), hasMore: response.hasMore, page }
      }
    } catch {
      // Keeps the loaded pages; the button stays available to retry.
    } finally {
      isLoadingMore.value = false
    }
  }

  return {
    tags,
    posts,
    pending,
    selectedTag,
    hasMore,
    featuredPost,
    secondaryFeaturedPosts,
    gridPosts,
    loadMore,
    error,
    ready: Promise.all([feedReady, featuredReady])
  }
}
