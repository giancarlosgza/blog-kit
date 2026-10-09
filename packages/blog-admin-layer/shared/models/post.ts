import type { IFirestoreDateValue } from './date'

/**
 * Editorial workflow state. `isPublished` stays the public-visibility flag (the blog and the
 * rules read it): only a publish sets it true, so a live post can still be `review`/`changes`
 * while its next revision is worked on. Legacy docs have no `status` (see resolvePostStatus).
 */
export type PostStatus = 'draft' | 'review' | 'changes' | 'scheduled' | 'published'

/** Who performed a workflow step; `{ uid: 'system', name: 'Scheduler' }` for the scheduled publisher. */
export interface IPostActor {
  uid: string
  name: string
}

/** The current review cycle, written only by the server routes. */
export interface IPostReview {
  /** 1 on the first submit, +1 on every resubmit after changes were requested. */
  round: number
  submittedAt: IFirestoreDateValue
  submittedBy: IPostActor
  /** Latest note in the thread: the submitter's note, then the reviewer's change request. */
  note?: string
  requestedAt?: IFirestoreDateValue
  requestedBy?: IPostActor
  reasons?: string[]
  /** The author marked the change request as addressed. */
  resolved?: boolean
}

/**
 * `posts/{slug}` — post metadata. Document ID is the URL slug.
 * `createdAt`/`updatedAt` are stored as Unix-ms numbers in the migrated data,
 * but the type tolerates legacy Firestore Timestamp shapes too.
 */
export interface IPost {
  id?: string
  slug?: string
  title: string
  shortText?: string
  isPublished: boolean
  status?: PostStatus
  /** When a `scheduled` post goes live (the scheduled Cloud Function publishes it). */
  publishAt?: IFirestoreDateValue
  review?: IPostReview
  createdAt?: IFirestoreDateValue
  updatedAt?: IFirestoreDateValue
  authorName?: string
  authorUuid?: string
  /** Denormalized from the author doc so the public blog avoids a per-card author read. */
  authorPhotoURL?: string
  /** Denormalized author slug for linking to the author's public page. */
  authorSlug?: string
  /** Legacy field: author display name on older documents. */
  author?: string
  imageAlt?: string
  imagePath?: string
  imageURL?: string
  /** Accent color for the post (used for the list icon and public theming). */
  color?: string
  tags?: string[]
  /** Search/social title override; falls back to `title` (see resolvePostSeo). */
  seoTitle?: string
  /** Meta description override; falls back to `shortText`, then a body excerpt. */
  seoDescription?: string
  /** Social share image override; falls back to the cover, then the generated OG image. */
  ogImageURL?: string
  /** Absolute canonical URL override for republished content; defaults to the post URL. */
  canonicalURL?: string
  /** Hides the post from search engines and the sitemap while keeping it public. */
  noindex?: boolean
  /** Slug (document ID) of the `series/{slug}` this post belongs to. */
  seriesSlug?: string
  /** 1-based part number within the series. */
  seriesOrder?: number
  /** Shown in the blog home hero (published posts only). */
  featured?: boolean
  /** Hero order among featured posts, lower first; ties fall back to newest first. */
  featuredOrder?: number
}

/**
 * `postContents/{slug}` (published body) and `postDrafts/{slug}` (working body).
 * `contents` is an HTML string.
 */
export interface IPostContent {
  id?: string
  contents: string
  updatedAt?: IFirestoreDateValue
}

export type PostEventType
  = | 'created'
    | 'submitted'
    | 'withdrawn'
    | 'changes_requested'
    | 'resolved'
    | 'resubmitted'
    | 'approved'
    | 'scheduled'
    | 'published'
    | 'unpublished'

/** `posts/{slug}/events/{autoId}` — workflow history, written by the server only. */
export interface IPostEvent {
  id?: string
  type: PostEventType
  from?: PostStatus
  to?: PostStatus
  note?: string
  reasons?: string[]
  actor: IPostActor
  at: IFirestoreDateValue
}
