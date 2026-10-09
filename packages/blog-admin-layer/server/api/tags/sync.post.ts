import { getApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

/**
 * Recompute each tag's `count` (number of posts using it) from the `posts` collection.
 *
 * Mirrors the admin project's filter/tag count sync, but server-side via the Admin SDK:
 * tallies every post's `tags` array, then batch-updates the `count` on existing tag docs
 * whose value drifted. Tags referenced by posts but missing from the `tags` collection are
 * ignored (create them via the Tags page first).
 */
export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const db = getFirestore(getApp())

  // 1. Tally tag usage across all posts (tags are stored as an array of names).
  const postsSnap = await db.collection('posts').get()
  const counts = new Map<string, number>()
  for (const postDoc of postsSnap.docs) {
    const tags = postDoc.data()?.tags
    if (!Array.isArray(tags))
      continue
    for (const tag of tags) {
      if (typeof tag === 'string' && tag.trim() !== '') {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
  }

  // 2. Batch-update existing tag docs whose count changed (Firestore batch limit is 500).
  const tagsSnap = await db.collection('tags').get()
  let batch = db.batch()
  let ops = 0
  let updated = 0

  for (const tagDoc of tagsSnap.docs) {
    const data = tagDoc.data()
    const name = (typeof data?.name === 'string' && data.name) ? data.name : tagDoc.id
    const newCount = counts.get(name) ?? 0

    if (data?.count === newCount)
      continue

    batch.update(tagDoc.ref, { count: newCount, updatedAt: Timestamp.now() })
    ops++
    updated++

    if (ops >= 450) {
      await batch.commit()
      batch = db.batch()
      ops = 0
    }
  }

  if (ops > 0)
    await batch.commit()

  return { ok: true, updated, totalTags: tagsSnap.size }
})
