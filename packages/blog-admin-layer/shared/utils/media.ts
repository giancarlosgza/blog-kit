import type { IMediaFile, MediaFolder, MediaUsageKind, MediaUsageMap } from '../models/media'
import { MEDIA_FOLDERS } from '../models/media'

/**
 * Pure helpers behind the media library: Storage path validation, download-URL parsing
 * and matching Firestore references to Storage objects. Shared by `server/api/media`
 * (listing + delete guard) and the admin page.
 */

/** Interfaces */
export interface IParsedStorageRef {
  /** Null when the reference is a bare object path. */
  bucket: string | null
  path: string
}

export interface IMediaPostSource {
  id: string
  title?: string | null
  imageURL?: string | null
  imagePath?: string | null
  ogImageURL?: string | null
}

export interface IMediaBodySource {
  /** Post slug (doc id of `postDrafts` / `postContents`). */
  id: string
  contents?: string | null
}

export interface IMediaAuthorSource {
  id: string
  name?: string | null
  photoURL?: string | null
}

export interface IMediaUsageSources {
  posts?: IMediaPostSource[]
  bodies?: IMediaBodySource[]
  authors?: IMediaAuthorSource[]
  logoURL?: string | null
}

export function isMediaFolder(value: unknown): value is MediaFolder {
  return typeof value === 'string' && (MEDIA_FOLDERS as readonly string[]).includes(value)
}

/**
 * Returns `path` when it is a safe object path inside a known folder, else null.
 * Rejects leading slashes, backslashes, empty / dot segments and control characters,
 * so a request can never reach objects outside the media folders.
 */
export function validateMediaPath(path: unknown): string | null {
  if (typeof path !== 'string' || !path || path.length > 1024)
    return null
  // eslint-disable-next-line no-control-regex
  if (path.startsWith('/') || path.includes('\\') || /[\u0000-\u001F\u007F]/.test(path))
    return null
  const segments = path.split('/')
  if (segments.length < 2 || segments.some(segment => !segment || segment === '.' || segment === '..'))
    return null
  return isMediaFolder(segments[0]) ? path : null
}

export function mediaFolderOf(path: string): MediaFolder | null {
  const folder = path.split('/')[0]
  return isMediaFolder(folder) ? folder : null
}

export function mediaFileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function decodeSegments(value: string): string | null {
  const segments = value.split('/').map(safeDecode)
  return segments.includes(null) ? null : segments.join('/')
}

/**
 * Reads the bucket and object path from any Storage reference we store: tokenized download
 * URLs (`/v0/b/{bucket}/o/{encodedPath}`, on the prod or emulator host), public
 * `storage.googleapis.com` URLs, `gs://` URIs and bare object paths.
 */
export function parseStorageRef(value: unknown): IParsedStorageRef | null {
  if (typeof value !== 'string')
    return null
  const raw = value.trim()
  if (!raw)
    return null

  if (raw.startsWith('gs://')) {
    const rest = raw.slice('gs://'.length)
    const slash = rest.indexOf('/')
    if (slash <= 0)
      return null
    return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) }
  }

  if (!/^https?:\/\//i.test(raw))
    return raw.includes('://') || raw.startsWith('/') ? null : { bucket: null, path: raw }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  const download = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/)
  if (download) {
    const bucket = safeDecode(download[1]!)
    // The object path is one encoded segment (`%2F` separators).
    const path = safeDecode(download[2]!)
    return bucket && path ? { bucket, path } : null
  }

  const host = url.hostname.toLowerCase()
  if (host === 'storage.googleapis.com') {
    const [, bucket, ...rest] = url.pathname.split('/')
    const path = decodeSegments(rest.join('/'))
    return bucket && path ? { bucket, path } : null
  }
  if (host.endsWith('.storage.googleapis.com')) {
    const path = decodeSegments(url.pathname.slice(1))
    return path ? { bucket: host.slice(0, -'.storage.googleapis.com'.length), path } : null
  }

  return null
}

/**
 * The media-folder object path a reference points to, or null when it points elsewhere.
 * With `bucket`, references to another bucket are ignored.
 */
export function storagePathFromRef(value: unknown, bucket?: string | null): string | null {
  const parsed = parseStorageRef(value)
  if (!parsed)
    return null
  if (bucket && parsed.bucket && parsed.bucket !== bucket)
    return null
  return validateMediaPath(parsed.path)
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

const IMG_TAG = /<img\b[^>]*>/gi
const ATTR = /\s(src|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi

/** Every `src` and `srcset` candidate URL of the `<img>` tags in an HTML body. */
export function extractImageSources(html: string | null | undefined): string[] {
  if (!html)
    return []
  const sources: string[] = []
  for (const tag of html.match(IMG_TAG) ?? []) {
    for (const match of tag.matchAll(ATTR)) {
      const value = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '')
      if (match[1]!.toLowerCase() === 'srcset')
        sources.push(...value.split(',').map(candidate => candidate.trim().split(/\s+/)[0] ?? '').filter(Boolean))
      else if (value.trim())
        sources.push(value.trim())
    }
  }
  return sources
}

/**
 * Maps each referenced media path to where it is used: post covers (`imageURL`/`imagePath`),
 * SEO images (`ogImageURL`), images in draft or published bodies, author photos and the logo.
 * A place is listed once per path even when it references the file several times.
 */
export function buildMediaUsage(sources: IMediaUsageSources, bucket?: string | null): MediaUsageMap {
  const usage: MediaUsageMap = {}
  const seen = new Set<string>()
  const postTitles = new Map((sources.posts ?? []).map(post => [post.id, post.title?.trim() || post.id]))

  function add(ref: unknown, kind: MediaUsageKind, id: string, title: string, editPath: string): void {
    const path = storagePathFromRef(ref, bucket)
    if (!path)
      return
    const key = `${path}\n${kind}\n${id}`
    if (seen.has(key))
      return
    seen.add(key)
    ;(usage[path] ??= []).push({ kind, id, title, editPath })
  }

  for (const post of sources.posts ?? []) {
    const title = postTitles.get(post.id) ?? post.id
    const editPath = `/posts/${encodeURIComponent(post.id)}`
    add(post.imageURL, 'post-cover', post.id, title, editPath)
    add(post.imagePath, 'post-cover', post.id, title, editPath)
    add(post.ogImageURL, 'post-seo', post.id, title, editPath)
  }
  for (const body of sources.bodies ?? []) {
    const title = postTitles.get(body.id) ?? body.id
    const editPath = `/posts/${encodeURIComponent(body.id)}`
    for (const src of extractImageSources(body.contents))
      add(src, 'post-body', body.id, title, editPath)
  }
  for (const author of sources.authors ?? [])
    add(author.photoURL, 'author-photo', author.id, author.name?.trim() || author.id, `/authors/${encodeURIComponent(author.id)}/edit`)
  add(sources.logoURL, 'logo', 'general', 'Blog logo', '/settings')

  return usage
}

export function isMediaInUse(path: string, usage: MediaUsageMap): boolean {
  return (usage[path]?.length ?? 0) > 0
}

export function unusedMediaFiles(files: IMediaFile[], usage: MediaUsageMap): IMediaFile[] {
  return files.filter(file => !isMediaInUse(file.path, usage))
}

/** Firebase's tokenized download URL; `tokens` is the comma-separated `firebaseStorageDownloadTokens`. */
export function buildDownloadUrl(bucket: string, path: string, tokens: unknown): string | null {
  const token = typeof tokens === 'string' ? tokens.split(',')[0]?.trim() : ''
  if (!token)
    return null
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(path)}?alt=media&token=${encodeURIComponent(token)}`
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0)
    return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${Number(value.toFixed(exponent === 0 || value >= 10 ? 0 : 1))} ${units[exponent]}`
}
