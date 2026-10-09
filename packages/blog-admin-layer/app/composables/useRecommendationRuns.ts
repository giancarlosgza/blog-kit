import type { IRecommendationPin, IRecommendationRun } from '#admin/shared/models/recommendation'
import { deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { RECOMMENDATIONS_COLLECTION } from '#admin/shared/models/recommendation'

/**
 * Saved Gemini runs, newest first. Reopening the page reads this list instead of calling Gemini again.
 */
export function useRecommendationRuns() {
  const db = useFirestore()
  const {
    documents: runs,
    error,
    isLoading,
    hasNotDocs,
    fetchDocs
  } = useFirebaseCollection<IRecommendationRun>({
    collectionPath: RECOMMENDATIONS_COLLECTION,
    docsLimit: 40
  })

  function prependRun(run: IRecommendationRun): void {
    runs.value = [run, ...runs.value]
  }

  async function savePins(run: IRecommendationRun, pinned: IRecommendationPin[]): Promise<void> {
    if (!run.id)
      return
    run.pinned = pinned
    await updateDoc(doc(db, RECOMMENDATIONS_COLLECTION, run.id), { pinned, updatedAt: serverTimestamp() })
  }

  async function removeRun(run: IRecommendationRun): Promise<void> {
    if (!run.id)
      return
    await deleteDoc(doc(db, RECOMMENDATIONS_COLLECTION, run.id))
    runs.value = runs.value.filter(item => item.id !== run.id)
  }

  return {
    runs,
    error,
    isLoading,
    hasNotDocs,
    fetchRuns: fetchDocs,
    prependRun,
    savePins,
    removeRun
  }
}
