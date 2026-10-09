import type { IFirestoreDateValue } from './date'

/**
 * `series/{slug}` — an ordered set of posts. The document ID is the URL slug.
 * Posts join a series through `posts.seriesSlug` and are ordered by `posts.seriesOrder`.
 */
export interface ISeries {
  id?: string
  name: string
  slug: string
  description?: string
  createdAt?: IFirestoreDateValue
  updatedAt?: IFirestoreDateValue
}
