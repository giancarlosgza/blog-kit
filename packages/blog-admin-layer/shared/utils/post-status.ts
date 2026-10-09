import type { IPost, PostEventType, PostStatus } from '@giancarlosgza/blog-core'

export const POST_STATUSES: PostStatus[] = ['draft', 'review', 'changes', 'scheduled', 'published']

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  review: 'In review',
  changes: 'Changes requested',
  scheduled: 'Scheduled',
  published: 'Published'
}

export interface IPostStatusBadge {
  variant: string
  iconCode?: string
  iconClass?: string
}

/** UiBadge presets per status, shared by the posts list, the review queue and the history. */
export const POST_STATUS_BADGES: Record<PostStatus, IPostStatusBadge> = {
  draft: { variant: 'tonal tonal-default' },
  review: { variant: 'tonal tonal-secondary' },
  changes: { variant: 'tonal tonal-warning' },
  scheduled: { variant: 'outline', iconCode: '&#xe8b5;', iconClass: 'fs-sm text-secondary' },
  published: { variant: 'success' }
}

/** Quick reasons offered when requesting changes; the note carries the details. */
export const REVIEW_REASONS = ['SEO', 'Cover image', 'Tone', 'Facts', 'Formatting'] as const

export const REVIEW_NOTE_MAX = 1000

export function isPostStatus(value: unknown): value is PostStatus {
  return typeof value === 'string' && (POST_STATUSES as string[]).includes(value)
}

/** Workflow status, derived for legacy docs that predate `status`. */
export function resolvePostStatus(post: Pick<IPost, 'status' | 'isPublished'> | null | undefined): PostStatus {
  if (isPostStatus(post?.status))
    return post.status
  return post?.isPublished ? 'published' : 'draft'
}

/** Where a post rests when it leaves review without being published: live posts stay live. */
export function restingStatus(isPublished: boolean | undefined): PostStatus {
  return isPublished ? 'published' : 'draft'
}

export function canSubmitForReview(status: PostStatus): boolean {
  return status === 'draft' || status === 'changes' || status === 'published'
}

/** Keeps only known reasons, de-duplicated, in the offered order. */
export function normalizeReviewReasons(reasons: unknown): string[] {
  if (!Array.isArray(reasons))
    return []
  return REVIEW_REASONS.filter(reason => reasons.includes(reason))
}

export const POST_EVENT_LABELS: Record<PostEventType, string> = {
  created: 'created the draft',
  submitted: 'submitted for review',
  withdrawn: 'withdrew from review',
  changes_requested: 'requested changes',
  resolved: 'marked the note resolved',
  resubmitted: 'resubmitted for review',
  approved: 'approved',
  scheduled: 'scheduled the post',
  published: 'published the post',
  unpublished: 'unpublished the post'
}
