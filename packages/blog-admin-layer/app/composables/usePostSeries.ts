import type { IPost, ISeries } from '@giancarlosgza/blog-core'
import type { InjectionKey, Ref } from 'vue'
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

/** Interfaces */
export interface IPostSeries {
  parts: Ref<IPost[]>
  isLoadingParts: Ref<boolean>
  loadParts: (seriesSlug: string) => Promise<void>
  createSeries: (series: Pick<ISeries, 'name' | 'slug' | 'description'>) => Promise<void>
}

/** Constants */
const SERIES_PARTS_LIMIT = 100
const postSeriesKey: InjectionKey<IPostSeries> = Symbol('post-series')

/**
 * Series helpers for the post editor: the posts of one series (drafts included, staff can list
 * them) and inline creation of `series/{slug}` docs.
 */
function createPostSeries(): IPostSeries {
  const db = useFirestore()

  const parts = ref<IPost[]>([])
  const isLoadingParts = ref(false)
  let partsRequest = 0

  /** Equality-only query, so the single-field index serves it (no composite index). */
  async function loadParts(seriesSlug: string): Promise<void> {
    const request = ++partsRequest
    if (!seriesSlug) {
      parts.value = []
      isLoadingParts.value = false
      return
    }

    isLoadingParts.value = true
    try {
      const snapshot = await getDocs(query(collection(db, 'posts'), where('seriesSlug', '==', seriesSlug), limit(SERIES_PARTS_LIMIT)))
      // A slower response for a series picked earlier must not overwrite the current one.
      if (request === partsRequest)
        parts.value = snapshot.docs.map(item => ({ id: item.id, ...item.data() }) as IPost)
    } catch (err: unknown) {
      if (request === partsRequest)
        parts.value = []
      console.log('Failed to load series parts:', err)
    } finally {
      if (request === partsRequest)
        isLoadingParts.value = false
    }
  }

  /** Writes `series/{slug}` unless it already exists (the post then just joins it). */
  async function createSeries(series: Pick<ISeries, 'name' | 'slug' | 'description'>): Promise<void> {
    const seriesRef = doc(db, 'series', series.slug)
    if ((await getDoc(seriesRef)).exists())
      return
    await setDoc(seriesRef, {
      ...series,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }

  return { parts, isLoadingParts, loadParts, createSeries }
}

/** Created by the editor page (which saves new series) and shared with the Series card. */
export function providePostSeries(series: IPostSeries = createPostSeries()): IPostSeries {
  provide(postSeriesKey, series)
  return series
}

export function usePostSeries(): IPostSeries {
  const series = inject(postSeriesKey)
  if (!series)
    throw new Error('usePostSeries() needs a parent page that calls providePostSeries()')
  return series
}
