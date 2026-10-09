import type { DocumentData, QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore'
import type { AdminRole, IAdmin } from '#admin/shared/models/admin'
import { collection, deleteDoc, doc, documentId, getDocs, limit, orderBy, query, serverTimestamp, setDoc, startAfter } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

interface GetAdminsOptions {
  limit?: number
  startAfter?: QueryDocumentSnapshot<DocumentData> | null
}
interface GetAdminsResult {
  users: IAdmin[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

export function useAdminUsers() {
  const db = useFirestore()
  const collectionRef = collection(db, 'admins')

  async function getAdmins(options: GetAdminsOptions = {}): Promise<GetAdminsResult> {
    const { limit: limitValue = 12, startAfter: startAfterDoc = null } = options

    try {
      const constraints: QueryConstraint[] = [
        orderBy(documentId()),
        limit(limitValue)
      ]

      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc))
      }

      const adminsQuery = query(collectionRef, ...constraints)
      const snapshot = await getDocs(adminsQuery)
      const mappedUsers = snapshot.docs.map(document => ({
        id: document.id,
        ...document.data()
      }) as IAdmin)
      const lastVisible = snapshot.docs.at(-1) ?? null

      return {
        users: mappedUsers,
        lastDoc: lastVisible,
        hasMore: snapshot.docs.length === limitValue
      }
    } catch (error) {
      console.log('Failed to fetch admin users:', error)
      throw error
    }
  }

  async function deleteAdmin(userId: string | null | undefined): Promise<void> {
    if (!userId) {
      return
    }

    try {
      await deleteDoc(doc(collectionRef, userId))
    } catch (error) {
      console.log('Failed to delete admin user:', error)
      throw error
    }
  }

  async function setRole(user: IAdmin | null | undefined, role: AdminRole): Promise<void> {
    if (!user?.id) {
      return
    }

    try {
      await setDoc(doc(collectionRef, user.id), {
        name: user.name ?? user.displayName ?? null,
        displayName: user.displayName ?? null,
        email: user.email ?? null,
        role,
        isAdmin: role === 'admin',
        createdAt: user.createdAt ?? serverTimestamp()
      }, { merge: true })
    } catch (error) {
      console.log('Failed to update admin role:', error)
      throw error
    }
  }

  return {
    getAdmins,
    deleteAdmin,
    setRole
  }
}
