import type { IPostReview } from '#admin/shared/models/post'
import { Timestamp } from 'firebase-admin/firestore'
import { canSubmitForReview, resolvePostStatus, REVIEW_NOTE_MAX } from '#admin/shared/utils/post-status'

/** Submit (or resubmit after changes) for review: draft | changes | published → review. */
export default defineEventHandler(async (event) => {
  const caller = await requireWorkflowCaller(event)
  const body = await readWorkflowBody<{ note: unknown }>(event)
  const note = readNote(body.note, REVIEW_NOTE_MAX)
  const db = workflowDb()
  const ref = postRef(db, body.slug)

  return db.runTransaction(async (tx) => {
    const post = await readPostInTransaction(tx, ref)
    const from = resolvePostStatus(post)
    if (!canSubmitForReview(from))
      throw createError({ statusCode: 409, statusMessage: `Cannot submit a post that is ${from}` })

    const isResubmit = from === 'changes'
    const now = Timestamp.now()
    const review: IPostReview = {
      round: isResubmit ? (post.review?.round ?? 1) + 1 : 1,
      submittedAt: now,
      submittedBy: caller.actor,
      ...(note ? { note } : {})
    }

    tx.update(ref, { status: 'review', review, updatedAt: now })
    addPostEvent(tx, ref, { type: isResubmit ? 'resubmitted' : 'submitted', from, to: 'review', note, actor: caller.actor }, now)

    return workflowResponse(body.slug, { ...post, status: 'review', review })
  })
})
