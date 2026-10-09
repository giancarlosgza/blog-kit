import type { IMediaFile, MediaUsageMap } from '#admin/shared/models/media'
import type { IMediaAuthorSource, IMediaBodySource, IMediaPostSource } from '#admin/shared/utils/media'
import { getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { MEDIA_FOLDERS } from '#admin/shared/models/media'
import { buildDownloadUrl, buildMediaUsage, mediaFileName, validateMediaPath } from '#admin/shared/utils/media'

function toMillis(value: unknown): number | null {
  if (typeof value !== 'string')
    return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

/** Every object under the media folders, newest first. */
export async function listMediaFiles(bucketName: string): Promise<IMediaFile[]> {
  const bucket = getStorage(getApp()).bucket(bucketName)
  const perFolder = await Promise.all(MEDIA_FOLDERS.map(async (folder) => {
    const [objects] = await bucket.getFiles({ prefix: `${folder}/`, autoPaginate: true })
    return objects.flatMap((object): IMediaFile[] => {
      const path = validateMediaPath(object.name)
      // Console-created "folders" are zero-byte objects ending in a slash; validation drops them.
      if (!path)
        return []
      const metadata = object.metadata ?? {}
      return [{
        path,
        folder,
        name: mediaFileName(path),
        size: Number(metadata.size ?? 0) || 0,
        contentType: metadata.contentType ?? null,
        updated: toMillis(metadata.updated ?? metadata.timeCreated),
        url: buildDownloadUrl(bucketName, path, metadata.metadata?.firebaseStorageDownloadTokens)
      }]
    })
  }))
  return perFolder.flat().sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0))
}

/** Scans posts, draft and published bodies, authors and the logo for Storage references. */
export async function scanMediaUsage(bucketName: string | null): Promise<MediaUsageMap> {
  const db = getFirestore(getApp())
  const [posts, drafts, contents, authors, settings] = await Promise.all([
    db.collection('posts').select('title', 'imageURL', 'imagePath', 'ogImageURL').get(),
    db.collection('postDrafts').select('contents').get(),
    db.collection('postContents').select('contents').get(),
    db.collection('authors').select('name', 'photoURL').get(),
    db.collection('settings').doc('general').get()
  ])

  const bodies: IMediaBodySource[] = [...drafts.docs, ...contents.docs].map(doc => ({ id: doc.id, contents: doc.get('contents') }))
  const postSources: IMediaPostSource[] = posts.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  const authorSources: IMediaAuthorSource[] = authors.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  return buildMediaUsage({
    posts: postSources,
    bodies,
    authors: authorSources,
    logoURL: settings.exists ? settings.get('logoURL') : null
  }, bucketName)
}
