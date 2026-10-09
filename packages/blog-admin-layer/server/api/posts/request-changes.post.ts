import type { IPostReview } from '#admin/shared/models/post'
import { Timestamp } from 'firebase-admin/firestore'
import { normalizeReviewReasons, resolvePostStatus, REVIEW_NOTE_MAX } from '#admin/shared/utils/post-status'

/** Send a post back to its author (admins): review → changes, with a required note. */
export default defineEventHandler(async (event) => {
  const caller = await requireWorkflowCaller(event, true)
  const body = await readWorkflowBody<{ note: unknown, reasons: unknown }>(event)
  const note = readNote(body.note, REVIEW_NOTE_MAX, true)
  const reasons = normalizeReviewReasons(body.reasons)
  const db = workflowDb()
  const ref = postRef(db, body.slug)

  return db.runTransaction(async (tx) => {
    const post = await readPostInTransaction(tx, ref)
    const from = resolvePostStatus(post)
    assertStatus(from, ['review'], 'request changes on')

    const now = Timestamp.now()
    const review: IPostReview = {
      round: post.review?.round ?? 1,
      submittedAt: post.review?.submittedAt ?? now,
      submittedBy: post.review?.submittedBy ?? caller.actor,
      note,
      requestedAt: now,
      requestedBy: caller.actor,
      reasons,
      resolved: false
    }

    tx.update(ref, { status: 'changes', review, updatedAt: now })
    addPostEvent(tx, ref, { type: 'changes_requested', from, to: 'changes', note, reasons, actor: caller.actor }, now)

    return workflowResponse(body.slug, { ...post, status: 'changes', review })
  })
})
