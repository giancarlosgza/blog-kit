import type { IFirestoreDateValue } from './date'

/**
 * `tags/{name}` — blog tag. The document ID is the display name (e.g. "CSS").
 * Posts reference tags by this name (`posts.tags` is a string[] of names).
 * `count` is the number of posts using the tag.
 */
export interface ITag {
  id?: string
  name: string
  slug?: string
  count?: number
  createdAt?: IFirestoreDateValue
  updatedAt?: IFirestoreDateValue
}
