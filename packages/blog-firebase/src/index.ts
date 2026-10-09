import type { Firestore } from 'firebase-admin/firestore'
import type { ScheduleOptions } from 'firebase-functions/v2/scheduler'
import { sanitizePostHtml } from '@giancarlosgza/blog-core/sanitize'
import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { onSchedule } from 'firebase-functions/v2/scheduler'

const SCHEDULER_ACTOR = { uid: 'system', name: 'Scheduler' }
const BATCH_LIMIT = 50

export interface IPublishDueResult {
  published: string[]
  failed: string[]
}

/**
 * Publishes one due post, with the same steps as the admin's publish route: read post + draft in a
 * transaction, sanitize the draft into `postContents`, flip isPublished/status, drop publishAt/review
 * and write the history event. Status and publishAt are re-checked inside the transaction, so
 * overlapping runs publish once. Resolves `true` when this call published the post.
 */
export async function publishScheduledPost(db: Firestore, slug: string, now: Timestamp): Promise<boolean> {
  const postRef = db.collection('posts').doc(slug)
  const draftRef = db.collection('postDrafts').doc(slug)

  return db.runTransaction(async (tx) => {
    const postSnap = await tx.get(postRef)
    const draftSnap = await tx.get(draftRef)
    const post = postSnap.exists ? postSnap.data() : undefined
    const publishAt = post?.publishAt
    const isDue = typeof publishAt?.toMillis === 'function' && publishAt.toMillis() <= now.toMillis()

    if (!post || post.status !== 'scheduled' || !isDue)
      return false
    if (!draftSnap.exists)
      throw new Error(`Scheduled post "${slug}" has no draft`)

    const contents = sanitizePostHtml(draftSnap.data()?.contents || '')
    tx.set(db.collection('postContents').doc(slug), { contents, updatedAt: now }, { merge: true })
    tx.update(postRef, {
      isPublished: true,
      status: 'published',
      publishAt: FieldValue.delete(),
      review: FieldValue.delete(),
      updatedAt: now
    })
    tx.create(postRef.collection('events').doc(), {
      type: 'published',
      from: 'scheduled',
      to: 'published',
      actor: SCHEDULER_ACTOR,
      at: now
    })
    return true
  })
}

/**
 * Publishes every scheduled post whose publishAt has passed (up to 50 per run).
 * Needs the (status ASC, publishAt ASC) composite index from `firestore.indexes.json`.
 */
export async function publishDuePosts(db: Firestore, now: Timestamp): Promise<IPublishDueResult> {
  const due = await db.collection('posts')
    .where('status', '==', 'scheduled')
    .where('publishAt', '<=', now)
    .orderBy('publishAt', 'asc')
    .limit(BATCH_LIMIT)
    .get()

  const published: string[] = []
  const failed: string[] = []
  for (const doc of due.docs) {
    try {
      if (await publishScheduledPost(db, doc.id, now))
        published.push(doc.id)
    } catch (error) {
      // One bad post must not block the rest; it stays scheduled and is retried next run
      logger.error(`Failed to publish scheduled post "${doc.id}"`, error)
      failed.push(doc.id)
    }
  }
  return { published, failed }
}

/**
 * Scheduled Cloud Function that publishes due posts. Runs hourly by default; any `onSchedule`
 * option (schedule, region, timeZone...) can be overridden. Initializes the Admin SDK if needed.
 */
export function createPublishScheduledPosts(options: Partial<ScheduleOptions> = {}) {
  return onSchedule(
    { schedule: '0 * * * *', memory: '256MiB', timeoutSeconds: 120, ...options },
    async () => {
      if (!getApps().length)
        initializeApp()

      const { published, failed } = await publishDuePosts(getFirestore(), Timestamp.now())
      if (published.length || failed.length)
        logger.info(`Scheduled publish: ${published.length} published, ${failed.length} failed`, { published, failed })
    }
  )
}
