import type { H3Event } from 'h3'
import { getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

/** Storage folders the editor uploads into, each keyed by the post slug (see useImageUpload callers). */
const POST_STORAGE_FOLDERS = ['covers', 'posts', 'seo'] as const

function isNotFound(err: unknown): boolean {
  return (err as { code?: number | string })?.code === 404
}

/** Deletes every file under `{folder}/{slug}/`; returns how many were removed. */
async function deletePostFiles(event: H3Event, slug: string): Promise<number> {
  const bucketName = resolveStorageBucket(event)
  if (!bucketName)
    return 0

  const bucket = getStorage(getApp()).bucket(bucketName)
  const counts = await Promise.all(POST_STORAGE_FOLDERS.map(async (folder) => {
    const [files] = await bucket.getFiles({ prefix: `${folder}/${slug}/` })
    const results = await Promise.all(files.map(file => file.delete({ ignoreNotFound: true })
      .then(() => 1)
      .catch((err: unknown) => {
        if (isNotFound(err))
          return 0
        throw err
      })))
    return results.reduce<number>((sum, count) => sum + count, 0)
  }))

  return counts.reduce((sum, count) => sum + count, 0)
}

/** Delete a post entirely: metadata, published body, draft and its uploaded images. */
export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const slug = getRouterParam(event, 'slug', { decode: true })?.trim()
  // A slash or dot segment would widen the Storage prefix beyond this post's folders.
  if (!slug || slug.includes('/') || slug === '.' || slug === '..') {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid slug' })
  }

  const db = getFirestore(getApp())
  await Promise.all([
    db.collection('posts').doc(slug).delete(),
    db.collection('postContents').doc(slug).delete(),
    db.collection('postDrafts').doc(slug).delete()
  ])

  let deletedFiles = 0
  try {
    deletedFiles = await deletePostFiles(event, slug)
  } catch (err) {
    // The docs are already gone, so report success and leave orphaned images to be cleaned up later.
    console.log(`[posts] Failed to delete Storage files for "${slug}":`, err)
  }

  return { ok: true, slug, deletedFiles }
})
