import { getDownloadURL, getStorage, ref as storageRef, uploadBytesResumable } from 'firebase/storage'

/** Raster formats we convert to webp. Vector (SVG) / animated (GIF) are uploaded as-is. */
const RASTER = /^image\/(?:jpe?g|png|webp|bmp|avif|tiff?)$/i

/**
 * Uploads an image to Firebase Storage, optimizing raster images to webp on the client first.
 * Returns the public download URL. Reuses the resumable-upload pattern that the settings logo
 * upload used inline; both the cover image and in-body editor images now go through here.
 */
export function useImageUpload() {
  const { $firebaseApp } = useNuxtApp()

  const isUploading = ref(false)
  const progress = ref(0)
  const error = ref('')

  /**
   * @param file       the picked image File
   * @param pathPrefix Storage folder, e.g. `covers/my-slug` or `posts/my-slug`
   * @returns the download URL of the stored (optimized) image
   */
  async function upload(file: File, pathPrefix: string): Promise<string> {
    isUploading.value = true
    error.value = ''
    progress.value = 0

    try {
      let blob: Blob = file
      let ext = 'webp'
      let contentType = 'image/webp'

      if (RASTER.test(file.type)) {
        // Dynamically imported: this browser-only lib must never load during SSR.
        const { default: imageCompression } = await import('browser-image-compression')
        blob = await imageCompression(file, {
          fileType: 'image/webp',
          maxWidthOrHeight: 1920,
          maxSizeMB: 1,
          initialQuality: 0.82,
          useWebWorker: true
        })
      } else {
        // SVG / GIF / unknown — keep the original so we don't rasterize vectors or drop animation.
        contentType = file.type || 'application/octet-stream'
        ext = (file.name.match(/\.([^.]+)$/)?.[1] || 'bin').toLowerCase()
      }

      const base = (file.name.replace(/\.[^.]+$/, '') || 'image')
        .replace(/[^\w-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'image'
      const path = `${pathPrefix}/${base}-${Date.now()}.${ext}`

      const storage = getStorage($firebaseApp)
      const task = uploadBytesResumable(storageRef(storage, path), blob, { contentType })

      return await new Promise<string>((resolve, reject) => {
        task.on(
          'state_changed',
          (snap) => {
            progress.value = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
          },
          (err) => {
            error.value = `Upload failed: ${err.message}`
            reject(err)
          },
          () => {
            getDownloadURL(task.snapshot.ref).then(resolve).catch(reject)
          }
        )
      })
    } catch (err: any) {
      if (!error.value)
        error.value = `Upload failed: ${err?.message ?? 'unknown error'}`
      throw err
    } finally {
      isUploading.value = false
    }
  }

  return { isUploading, progress, error, upload }
}
