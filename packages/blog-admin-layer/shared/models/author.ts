import type { IFirestoreDateValue } from './date'

/**
 * `authors/{uid}` — author profile. Document ID is the Firebase Auth UID.
 */
export interface IAuthor {
  id?: string
  uid?: string
  name: string
  /** URL slug for the author's public page (e.g. used by the blog's sitemap/author routes). */
  slug?: string
  description?: string
  photoURL?: string
  profileLink?: string
  createdAt?: IFirestoreDateValue
  updatedAt?: IFirestoreDateValue
}
