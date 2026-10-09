import type { IPostReview } from '#admin/shared/models/post'
import { Timestamp } from 'firebase-admin/firestore'
import { resolvePostStatus } from '#admin/shared/utils/post-status'

/** Mark the change request as addressed; the post stays in changes until it is resubmitted. */
export default defineEventHandler(async (event) => {
  const caller = await requireWorkflowCaller(event)
  const { slug } = await readWorkflowBody(event)
  const db = workflowDb()
  const ref = postRef(db, slug)

  return db.runTransaction(async (tx) => {
    const post = await readPostInTransaction(tx, ref)
    assertStatus(resolvePostStatus(post), ['changes'], 'resolve the note on')
    if (!post.review || post.review.resolved)
      return workflowResponse(slug, post)

    const now = Timestamp.now()
    const review: IPostReview = { ...post.review, resolved: true }
    tx.update(ref, { 'review.resolved': true, 'updatedAt': now })
    addPostEvent(tx, ref, { type: 'resolved', actor: caller.actor }, now)

    return workflowResponse(slug, { ...post, review })
  })
})
