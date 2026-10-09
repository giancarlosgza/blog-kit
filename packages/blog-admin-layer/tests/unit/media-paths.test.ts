import { describe, expect, it } from 'vitest'
import {
  buildDownloadUrl,
  formatBytes,
  isMediaFolder,
  mediaFileName,
  mediaFolderOf,
  parseStorageRef,
  storagePathFromRef,
  validateMediaPath
} from '#admin/shared/utils/media'

const BUCKET = 'colorffy-blog.firebasestorage.app'
function downloadUrl(path: string, bucket = BUCKET) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=abc-123`
}

describe('validateMediaPath', () => {
  it('accepts object paths inside the known folders', () => {
    for (const path of ['covers/my-post/cover-1.webp', 'posts/misc/a.png', 'authors/uid/me.webp', 'logos/logo.svg', 'seo/slug/og.png'])
      expect(validateMediaPath(path)).toBe(path)
  })

  it('rejects unknown folders and folder roots', () => {
    expect(validateMediaPath('private/secret.png')).toBeNull()
    expect(validateMediaPath('covers')).toBeNull()
    expect(validateMediaPath('covers/')).toBeNull()
    expect(validateMediaPath('Covers/a.png')).toBeNull()
  })

  it('rejects traversal, leading slashes and malformed segments', () => {
    expect(validateMediaPath('covers/../private/a.png')).toBeNull()
    expect(validateMediaPath('covers/./a.png')).toBeNull()
    expect(validateMediaPath('/covers/a.png')).toBeNull()
    expect(validateMediaPath('covers//a.png')).toBeNull()
    expect(validateMediaPath('covers\\a.png')).toBeNull()
    expect(validateMediaPath('covers/a\u0000.png')).toBeNull()
    expect(validateMediaPath('..')).toBeNull()
  })

  it('rejects non-strings and empty values', () => {
    expect(validateMediaPath(undefined)).toBeNull()
    expect(validateMediaPath(42)).toBeNull()
    expect(validateMediaPath('')).toBeNull()
    expect(validateMediaPath(`covers/${'a'.repeat(1100)}`)).toBeNull()
  })
})

describe('folder helpers', () => {
  it('detects folders and names', () => {
    expect(isMediaFolder('seo')).toBe(true)
    expect(isMediaFolder('misc')).toBe(false)
    expect(mediaFolderOf('covers/x/y.webp')).toBe('covers')
    expect(mediaFolderOf('other/y.webp')).toBeNull()
    expect(mediaFileName('covers/x/y.webp')).toBe('y.webp')
  })
})

describe('parseStorageRef', () => {
  it('parses tokenized download URLs with encoded paths', () => {
    expect(parseStorageRef(downloadUrl('covers/my post/café.webp'))).toEqual({ bucket: BUCKET, path: 'covers/my post/café.webp' })
  })

  it('parses emulator download URLs', () => {
    expect(parseStorageRef('http://127.0.0.1:9199/v0/b/demo-bucket/o/posts%2Fa%2Fb.png?alt=media')).toEqual({ bucket: 'demo-bucket', path: 'posts/a/b.png' })
  })

  it('parses public storage.googleapis.com URLs in both host styles', () => {
    expect(parseStorageRef(`https://storage.googleapis.com/${BUCKET}/seo/a%20b/og.png`)).toEqual({ bucket: BUCKET, path: 'seo/a b/og.png' })
    expect(parseStorageRef('https://my-bucket.storage.googleapis.com/logos/logo.svg')).toEqual({ bucket: 'my-bucket', path: 'logos/logo.svg' })
  })

  it('parses gs:// URIs and bare paths', () => {
    expect(parseStorageRef(`gs://${BUCKET}/authors/uid/me.webp`)).toEqual({ bucket: BUCKET, path: 'authors/uid/me.webp' })
    expect(parseStorageRef('covers/x/y.webp')).toEqual({ bucket: null, path: 'covers/x/y.webp' })
  })

  it('ignores other URLs and junk', () => {
    expect(parseStorageRef('https://images.unsplash.com/photo-1?w=800')).toBeNull()
    expect(parseStorageRef('/images/a.png')).toBeNull()
    expect(parseStorageRef('ftp://host/a.png')).toBeNull()
    expect(parseStorageRef('https://firebasestorage.googleapis.com/v0/b/x/o/%E0%A4%A')).toBeNull()
    expect(parseStorageRef('gs://bucket-only')).toBeNull()
    expect(parseStorageRef(null)).toBeNull()
    expect(parseStorageRef('   ')).toBeNull()
  })
})

describe('storagePathFromRef', () => {
  it('returns media paths from the same bucket only', () => {
    expect(storagePathFromRef(downloadUrl('covers/a/b.webp'), BUCKET)).toBe('covers/a/b.webp')
    expect(storagePathFromRef(downloadUrl('covers/a/b.webp', 'other-bucket'), BUCKET)).toBeNull()
    expect(storagePathFromRef('covers/a/b.webp', BUCKET)).toBe('covers/a/b.webp')
  })

  it('drops references outside the media folders', () => {
    expect(storagePathFromRef(downloadUrl('private/a.png'), BUCKET)).toBeNull()
    expect(storagePathFromRef(downloadUrl('covers/../private/a.png'), BUCKET)).toBeNull()
    expect(storagePathFromRef('data:image/png;base64,AAAA')).toBeNull()
  })
})

describe('buildDownloadUrl', () => {
  it('builds a tokenized URL from the first token', () => {
    const url = buildDownloadUrl(BUCKET, 'covers/a b/c.webp', 'tok-1,tok-2')
    expect(url).toBe(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/covers%2Fa%20b%2Fc.webp?alt=media&token=tok-1`)
    expect(parseStorageRef(url)).toEqual({ bucket: BUCKET, path: 'covers/a b/c.webp' })
  })

  it('returns null without a token', () => {
    expect(buildDownloadUrl(BUCKET, 'covers/a.webp', undefined)).toBeNull()
    expect(buildDownloadUrl(BUCKET, 'covers/a.webp', '')).toBeNull()
  })
})

describe('formatBytes', () => {
  it('formats sizes with sensible precision', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(240 * 1024)).toBe('240 KB')
    expect(formatBytes(18.4 * 1024 * 1024)).toBe('18 MB')
    expect(formatBytes(1.25 * 1024 ** 3)).toBe('1.3 GB')
    expect(formatBytes(Number.NaN)).toBe('0 B')
  })
})
