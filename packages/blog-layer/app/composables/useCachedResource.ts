/** Interfaces */
interface IResourceError {
  statusCode?: number
  message?: string
}

/**
 * One read from the cached `server/api` endpoints, held in `useState` (colorffy's
 * `useChangelogs` pattern) instead of VueFire or `useFetch`:
 * - VueFire kept SSR state in one object shared by every anonymous request, so keys from other
 *   pages (`author-for-card-*`, `posts-home`, …) leaked into every payload.
 * - Post pages are swr-cached, where Nuxt drops the `useFetch` payload (`payload.data`) and only
 *   `useState` survives, so SSR-rendered data hydrates without a blank flash or mismatch.
 *
 * `ready` resolves once the state is filled: pages await it before throwing 404s and before
 * `defineOgImage`/SEO that read the data synchronously. `state` is `null` after a failed read,
 * which a later client navigation retries (never during hydration, to reuse the SSR result).
 */
// Client-only: several components can share one key, so a navigation starts one request per key.
const inflightLoads = new Map<string, Promise<void>>()

export function useCachedResource<T>(key: string, fetcher: () => Promise<T>) {
  const nuxtApp = useNuxtApp()
  const state = useState<T | null | undefined>(key, () => undefined)
  const error = ref<IResourceError | null>(null)

  async function load(): Promise<void> {
    try {
      state.value = await fetcher()
    } catch (loadError) {
      state.value = null
      error.value = loadError as IResourceError
    }
  }

  let ready: Promise<unknown> = Promise.resolve()
  if (import.meta.server) {
    // useAsyncData blocks SSR until the fetch resolves, so the filled state is serialized.
    ready = useAsyncData(key, async () => {
      if (state.value === undefined)
        await load()
      return true
    })
  } else if (state.value === undefined || (state.value === null && !nuxtApp.isHydrating)) {
    let pending = inflightLoads.get(key)
    if (!pending) {
      pending = load().finally(() => inflightLoads.delete(key))
      inflightLoads.set(key, pending)
    }
    ready = pending
  }

  return {
    state,
    data: computed<T | null>(() => state.value ?? null),
    pending: computed<boolean>(() => state.value === undefined),
    error,
    ready
  }
}

/**
 * Maps a failed read to the page error: missing data is a 404, an upstream failure a 503.
 * Fatal, so a client-side navigation also swaps to the error page instead of keeping the old one.
 */
export function resourceError(error: IResourceError | null, statusMessage: string) {
  const statusCode = error?.statusCode
  if (!error || statusCode === 404 || statusCode === 400)
    return createError({ statusCode: 404, statusMessage, fatal: true })

  return createError({ statusCode: statusCode && statusCode >= 500 ? statusCode : 503, statusMessage: 'Temporarily unavailable', fatal: true })
}
