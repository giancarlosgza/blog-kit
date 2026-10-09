/** Storage folders the admin uploads into; mirrors the public-read matches in `storage.rules`. */
export const MEDIA_FOLDERS = ['covers', 'posts', 'authors', 'logos', 'seo'] as const

export type MediaFolder = typeof MEDIA_FOLDERS[number]

export type MediaUsageKind = 'post-cover' | 'post-body' | 'post-seo' | 'author-photo' | 'logo'

/** One place a Storage file is referenced from. */
export interface IMediaUsage {
  kind: MediaUsageKind
  /** Doc id of the referencing post, author or settings doc. */
  id: string
  title: string
  /** Admin route that edits the referencing doc. */
  editPath: string
}

/** A file stored under one of the `MEDIA_FOLDERS`. */
export interface IMediaFile {
  /** Full Storage object path, e.g. `covers/my-post/cover-123.webp`. */
  path: string
  folder: MediaFolder
  name: string
  /** Size in bytes. */
  size: number
  contentType: string | null
  /** Last update as Unix ms. */
  updated: number | null
  /** Tokenized download URL; null when the object has no download token. */
  url: string | null
}

export type MediaUsageMap = Record<string, IMediaUsage[]>

/** `GET /api/media` */
export interface IMediaListResponse {
  files: IMediaFile[]
  usage: MediaUsageMap
  /** When the usage scan ran, as Unix ms. */
  scannedAt: number
}

/** `DELETE /api/media` body. */
export interface IMediaDeleteRequest {
  paths: string[]
}

export type MediaSkipReason = 'in-use' | 'not-found' | 'failed'

export interface IMediaDeleteSkip {
  path: string
  reason: MediaSkipReason
}

/** `DELETE /api/media` response. */
export interface IMediaDeleteResponse {
  deleted: string[]
  skipped: IMediaDeleteSkip[]
}
