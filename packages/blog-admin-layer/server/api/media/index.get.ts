import type { IMediaListResponse } from '#admin/shared/models/media'

/** Lists every file in the media folders together with where each one is referenced. */
export default defineEventHandler(async (event): Promise<IMediaListResponse> => {
  await requireStaff(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const bucketName = resolveStorageBucket(event)
  if (!bucketName) {
    throw createError({ statusCode: 500, statusMessage: 'Storage bucket is not configured' })
  }

  const [files, usage] = await Promise.all([
    listMediaFiles(bucketName),
    scanMediaUsage(bucketName)
  ])

  return { files, usage, scannedAt: Date.now() }
})
