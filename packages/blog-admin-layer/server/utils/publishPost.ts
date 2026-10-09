import type { Firestore } from 'firebase-admin/firestore'
import type { IPost, IPostActor, PostEventType } from '#admin/shared/models/post'
import type { IWorkflowResponse } from './postWorkflow'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { resolvePostStatus } from '#admin/shared/utils/post-status'
import { addPostEvent, postRef, readPostInTransaction, workflowResponse } from './postWorkflow'
import { sanitizePostHtml } from './sanitizePostHtml'

/**
 * Publish now. `functions/publish-scheduled.js` mirrors these steps for due scheduled posts:
 *   1. read the post and its draft in one transaction
 *   2. sanitize the draft (same allowlist, see the parity test) into `postContents`
 *   3. set isPublished + status published, drop publishAt/review
 *   4. write the history event
 * The transaction makes a double click (or a scheduler overlap) publish once.
 */
export async function publishPostNow(db: Firestore, slug: string, actor: IPostActor): Promise<IWorkflowResponse> {
  const ref = postRef(db, slug)
  const draftRef = db.collection('postDrafts').doc(slug)

  return db.runTransaction(async (tx) => {
    const post = await readPostInTransaction(tx, ref)
    const draftSnap = await tx.get(draftRef)
    if (!draftSnap.exists)
      throw createError({ statusCode: 404, statusMessage: 'Draft not found' })

    // Authoritative sanitize at the source before the body becomes publicly readable.
    const contents = sanitizePostHtml(draftSnap.data()?.contents ?? '')
    const from = resolvePostStatus(post)
    const now = Timestamp.now()
    const type: PostEventType = from === 'review' ? 'approved' : 'published'

    tx.set(db.collection('postContents').doc(slug), { contents, updatedAt: now }, { merge: true })
    tx.update(ref, { isPublished: true, status: 'published', publishAt: FieldValue.delete(), review: FieldValue.delete(), updatedAt: now })
    addPostEvent(tx, ref, { type, from, to: 'published', actor }, now)

    return workflowResponse(slug, { ...post, isPublished: true, status: 'published', publishAt: undefined, review: undefined })
  })
}

/** Schedule for later: the body is sanitized and copied when the scheduler publishes it. */
export async function schedulePost(db: Firestore, slug: string, actor: IPostActor, publishAt: Timestamp): Promise<IWorkflowResponse> {
  const ref = postRef(db, slug)

  return db.runTransaction(async (tx) => {
    const post: IPost = await readPostInTransaction(tx, ref)
    // A live post can't be "scheduled" without hiding it first; publish its changes now instead.
    if (post.isPublished)
      throw createError({ statusCode: 409, statusMessage: 'This post is live. Publish the changes now or unpublish it first' })

    const from = resolvePostStatus(post)
    const now = Timestamp.now()
    tx.update(ref, { status: 'scheduled', publishAt, updatedAt: now })
    addPostEvent(tx, ref, { type: from === 'review' ? 'approved' : 'scheduled', from, to: 'scheduled', actor }, now)

    return workflowResponse(slug, { ...post, status: 'scheduled', publishAt })
  })
}

/** Accepts an ISO string or Unix ms; must be at least a minute ahead so the scheduler can't miss it. */
export function parsePublishAt(value: unknown): Timestamp | null {
  if (value === undefined || value === null || value === '')
    return null
  const ms = typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : Number.NaN
  if (!Number.isFinite(ms))
    throw createError({ statusCode: 400, statusMessage: 'Invalid publish date' })
  if (ms < Date.now() + 60_000)
    throw createError({ statusCode: 400, statusMessage: 'Pick a publish time at least a minute from now' })
  return Timestamp.fromMillis(ms)
}
