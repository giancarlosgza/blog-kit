import type { IFirestoreDateValue } from './date'

/** Admin access roles. `admin` = full access; `editor` = content only (posts, authors, tags). */
export type AdminRole = 'admin' | 'editor'

export const ADMIN_ROLES: AdminRole[] = ['admin', 'editor']

/**
 * `admins/{uid}` — admin record. Document ID is the Firebase Auth UID.
 * `role` is the access flag (gate is enforced in the auth middleware,
 * `requireStaff`/`requireAdmin`, and `firestore.rules`); `isAdmin` is kept in
 * sync (`role === 'admin'`). Identity fields are denormalized so the Admin
 * Users page renders without a Firebase Auth lookup.
 */
export interface IAdmin {
  id?: string
  name?: string | null
  displayName?: string | null
  email?: string | null
  role?: AdminRole | null
  isAdmin?: boolean | null
  createdAt?: IFirestoreDateValue
}
