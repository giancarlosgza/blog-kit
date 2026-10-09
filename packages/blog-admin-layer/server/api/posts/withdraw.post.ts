import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { resolvePostStatus, restingStatus } from '#admin/shared/utils/post-status'

/** Withdraw from review (the submitter or an admin): review → draft, or back to published when live. */
export default defineEventHandler(async (event) => {
  const caller = await requireWorkflowCaller(event)
  const { slug } = await readWorkflowBody(event)
  const db = workflowDb()
  const ref = postRef(db, slug)

  return db.runTransaction(async (tx) => {
    const post = await readPostInTransaction(tx, ref)
    const from = resolvePostStatus(post)
    assertStatus(from, ['review'], 'withdraw')
    if (caller.role !== 'admin' && post.review?.submittedBy?.uid !== caller.uid)
      throw createError({ statusCode: 403, statusMessage: 'Only the submitter or an admin can withdraw this post' })

    const to = restingStatus(post.isPublished)
    const now = Timestamp.now()
    tx.update(ref, { status: to, review: FieldValue.delete(), updatedAt: now })
    addPostEvent(tx, ref, { type: 'withdrawn', from, to, actor: caller.actor }, now)

    return workflowResponse(slug, { ...post, status: to, review: undefined })
  })
})
