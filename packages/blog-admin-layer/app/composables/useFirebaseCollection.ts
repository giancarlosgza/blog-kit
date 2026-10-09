import type { DocumentData, QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore'
import { collection, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

/**
 * Configuration options for the Firebase collection composable.
 */
export interface UseFirebaseCollectionOptions<T> {
  /** The path to the collection, as a string or array of path segments (e.g., ['users', userId, 'posts']). */
  collectionPath: string | string[]
  /** Maximum number of documents to fetch per query. Defaults to 12; `null` fetches the whole collection in one query. */
  docsLimit?: number | null
  /** The field to order the collection by. Set to null to omit default ordering. Defaults to 'createdAt'. */
  orderByField?: string | null
  /** The direction to order the documents. Defaults to 'desc'. */
  orderDirection?: 'asc' | 'desc'
  /** Custom mapping function to transform a Firestore document snapshot into the generic type T. */
  mapDoc?: (_snapshot: QueryDocumentSnapshot<DocumentData>) => T
}

/**
 * A composable that handles fetching, mapping, and paginating documents from a Firestore collection.
 * It manages independent loading states (`isLoading`, `isLoadingMore`) to prevent UX jitter during pagination.
 *
 * @param options Configuration object for the collection query.
 */
export function useFirebaseCollection<T = any>(options: UseFirebaseCollectionOptions<T>) {
  const db = useFirestore()
  const {
    collectionPath,
    docsLimit = 12,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    mapDoc = snapshot => ({ id: snapshot.id, ...snapshot.data() } as unknown as T)
  } = options

  const pathArgs = Array.isArray(collectionPath) ? collectionPath : [collectionPath]
  const collectionRef = collection(db, pathArgs[0] as string, ...pathArgs.slice(1))
  const documents = ref<T[]>([])

  const lastDoc = ref<QueryDocumentSnapshot<DocumentData> | null>(null)
  const error = ref<Error | null>(null)
  const isLoading = ref<boolean>(false)
  const isLoadingMore = ref<boolean>(false)
  const hasMoreDocs = ref<boolean>(false)
  const hasNotDocs = computed(() => !isLoading.value && (!documents.value || documents.value.length < 1))

  /**
   * Fetches the initial batch of documents from the collection.
   * Resets pagination state and replaces the current documents array.
   *
   * @param constraints Optional array of standard Firestore QueryConstraints to apply dynamically. Can also receive a DOM Event if attached directly to a button click.
   */
  async function fetchDocs(constraints: QueryConstraint[] | Event = []) {
    const validConstraints = Array.isArray(constraints) ? constraints : []
    isLoading.value = true
    hasMoreDocs.value = false

    try {
      const baseConstraints = orderByField ? [orderBy(orderByField, orderDirection)] : []
      const limitConstraints = docsLimit === null ? [] : [limit(docsLimit)]
      const q = query(collectionRef, ...limitConstraints, ...baseConstraints, ...validConstraints)
      const res = await getDocs(q)

      lastDoc.value = res.docs.at(-1) ?? null
      documents.value = res.docs.map(mapDoc)
      hasMoreDocs.value = docsLimit !== null && res.docs.length === docsLimit
      error.value = null
    } catch (err: unknown) {
      error.value = err as Error
      console.log(`Failed to fetch ${pathArgs.join('/')}:`, err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetches the next batch of documents starting after the last fetched document.
   * Appends the new results to the existing documents array.
   *
   * @param constraints Optional array of standard Firestore QueryConstraints to apply dynamically. Can also receive a DOM Event if attached directly to a button click.
   */
  async function loadMoreDocs(constraints: QueryConstraint[] | Event = []) {
    const validConstraints = Array.isArray(constraints) ? constraints : []
    if (docsLimit === null || !lastDoc.value || !hasMoreDocs.value || isLoadingMore.value)
      return

    isLoadingMore.value = true

    try {
      const baseConstraints = orderByField ? [orderBy(orderByField, orderDirection)] : []
      const q = query(
        collectionRef,
        limit(docsLimit),
        ...baseConstraints,
        ...validConstraints,
        startAfter(lastDoc.value)
      )
      const res = await getDocs(q)

      if (!res.docs.length) {
        hasMoreDocs.value = false
        return
      }

      lastDoc.value = res.docs.at(-1) ?? null
      const next = res.docs.map(mapDoc)
      documents.value = [...(documents.value as any), ...next] as any
      hasMoreDocs.value = res.docs.length === docsLimit
    } catch (err: unknown) {
      error.value = err as Error
      console.log(`Failed to load more ${pathArgs.join('/')}:`, err)
    } finally {
      isLoadingMore.value = false
    }
  }

  return {
    collectionRef,
    documents,
    lastDoc,
    error,
    isLoading,
    isLoadingMore,
    hasMoreDocs,
    hasNotDocs,
    fetchDocs,
    loadMoreDocs
  }
}
