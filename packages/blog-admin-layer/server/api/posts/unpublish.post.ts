import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { resolvePostStatus } from '#admin/shared/utils/post-status'

/** Unpublish, or cancel a schedule (admins only). Keeps the content + draft; status → draft. */
export default defineEventHandler(async (event) => {
  const caller = await requireWorkflowCaller(event, true)
  const { slug } = await readWorkflowBody(event)
  const db = workflowDb()
  const ref = postRef(db, slug)

  return db.runTransaction(async (tx) => {
    const post = await readPostInTransaction(tx, ref)
    const from = resolvePostStatus(post)
    if (!post.isPublished && from !== 'scheduled')
      throw createError({ statusCode: 409, statusMessage: 'This post is not published or scheduled' })

    const now = Timestamp.now()
    tx.update(ref, { isPublished: false, status: 'draft', publishAt: FieldValue.delete(), review: FieldValue.delete(), updatedAt: now })
    addPostEvent(tx, ref, { type: 'unpublished', from, to: 'draft', actor: caller.actor }, now)

    return workflowResponse(slug, { ...post, isPublished: false, status: 'draft', publishAt: undefined, review: undefined })
  })
})
