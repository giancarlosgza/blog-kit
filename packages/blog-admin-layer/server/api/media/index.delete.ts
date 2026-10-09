import type { IMediaDeleteResponse, IMediaDeleteSkip } from '#admin/shared/models/media'
import { getApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { isMediaInUse, validateMediaPath } from '#admin/shared/utils/media'

const MAX_PATHS = 500

function isNotFound(err: unknown): boolean {
  return (err as { code?: number | string })?.code === 404
}

/** Deletes unused media files. Paths still referenced anywhere are skipped, never deleted. */
export default defineEventHandler(async (event): Promise<IMediaDeleteResponse> => {
  await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const body = await readBody<{ paths?: unknown }>(event)
  const requested = Array.isArray(body?.paths) ? body.paths : null
  if (!requested?.length || requested.length > MAX_PATHS) {
    throw createError({ statusCode: 400, statusMessage: `Send between 1 and ${MAX_PATHS} paths` })
  }

  const paths = [...new Set(requested.map(validateMediaPath))]
  if (paths.includes(null)) {
    throw createError({ statusCode: 400, statusMessage: 'Paths must point to files inside the media folders' })
  }

  const bucketName = resolveStorageBucket(event)
  if (!bucketName) {
    throw createError({ statusCode: 500, statusMessage: 'Storage bucket is not configured' })
  }

  // Re-scan instead of trusting the client: a file may have been attached since the list loaded.
  const usage = await scanMediaUsage(bucketName)
  const skipped: IMediaDeleteSkip[] = []
  const deletable: string[] = []
  for (const path of paths as string[]) {
    if (isMediaInUse(path, usage))
      skipped.push({ path, reason: 'in-use' })
    else
      deletable.push(path)
  }

  if (!deletable.length) {
    throw createError({
      statusCode: 409,
      statusMessage: skipped.length === 1 ? 'This file is in use and was not deleted' : 'These files are in use and were not deleted',
      data: { deleted: [], skipped } satisfies IMediaDeleteResponse
    })
  }

  const bucket = getStorage(getApp()).bucket(bucketName)
  const deleted: string[] = []
  await Promise.all(deletable.map(path => bucket.file(path).delete().then(() => {
    deleted.push(path)
  }).catch((err: unknown) => {
    if (!isNotFound(err))
      console.log(`[media] Failed to delete "${path}":`, err)
    skipped.push({ path, reason: isNotFound(err) ? 'not-found' : 'failed' })
  })))

  return { deleted, skipped }
})
