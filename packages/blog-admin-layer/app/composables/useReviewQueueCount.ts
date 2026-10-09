import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

/**
 * Posts waiting for review, shown as the sidebar badge for admins. Shared state so the
 * review queue and the editor can refresh it after approving or sending a post back.
 */
export function useReviewQueueCount() {
  const db = useFirestore()
  const count = useState<number>('reviewQueueCount', () => 0)

  async function refresh(): Promise<void> {
    try {
      const snapshot = await getCountFromServer(query(collection(db, 'posts'), where('status', '==', 'review')))
      count.value = snapshot.data().count
    } catch (error) {
      console.log('Review queue count failed:', error)
    }
  }

  return { count, refresh }
}
