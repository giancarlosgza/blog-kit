/**
 * Publish (admins only). A future `publishAt` schedules the post and the scheduled Cloud
 * Function publishes it; otherwise the draft is sanitized into `postContents` now.
 */
export default defineEventHandler(async (event) => {
  const caller = await requireWorkflowCaller(event, true)
  const body = await readWorkflowBody<{ publishAt: unknown }>(event)
  const publishAt = parsePublishAt(body.publishAt)
  const db = workflowDb()

  return publishAt
    ? schedulePost(db, body.slug, caller.actor, publishAt)
    : publishPostNow(db, body.slug, caller.actor)
})
