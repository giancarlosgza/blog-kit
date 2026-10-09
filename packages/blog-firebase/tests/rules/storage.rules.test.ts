import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

// Blog images (authors, covers, posts, logos, seo) are public to read. Uploads and
// deletes need a staff role in Firestore `admins/{uid}.role`, which the storage
// rules read cross-service, so both emulators run and the role docs are seeded.
// Cross-service reads resolve against the emulator's --project, so this suite must
// use the same id as `pnpm test:rules` instead of a per-file one.
const PROJECT_ID = 'demo-blog-kit'
const ADMIN_UID = 'admin-1'
const EDITOR_UID = 'editor-1'
const VIEWER_UID = 'viewer-1'
const PNG = new Uint8Array([0x89, 0x50, 0x4E, 0x47])
const IMAGE = { contentType: 'image/png' }
const PUBLIC_FOLDERS = ['authors', 'covers', 'posts', 'logos', 'seo']

let testEnv: RulesTestEnvironment

function storageAs(uid: string | null) {
  return uid ? testEnv.authenticatedContext(uid).storage() : testEnv.unauthenticatedContext().storage()
}

async function seedData() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'admins', ADMIN_UID), { role: 'admin', email: 'admin@example.com' })
    await setDoc(doc(db, 'admins', EDITOR_UID), { role: 'editor', email: 'editor@example.com' })
    await uploadBytes(ref(ctx.storage(), 'covers/existing.png'), PNG, IMAGE)
    await uploadBytes(ref(ctx.storage(), 'seo/my-post/existing.png'), PNG, IMAGE)
  })
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(__dirname, '../../storage.rules'), 'utf8') }
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.clearStorage()
  await seedData()
})

afterAll(async () => {
  await testEnv?.cleanup()
})

describe('blog image folders', () => {
  it.each(PUBLIC_FOLDERS)('lets staff upload images to %s', async (folder) => {
    await assertSucceeds(uploadBytes(ref(storageAs(EDITOR_UID), `${folder}/editor.png`), PNG, IMAGE))
    await assertSucceeds(uploadBytes(ref(storageAs(ADMIN_UID), `${folder}/admin.png`), PNG, IMAGE))
  })

  it.each(PUBLIC_FOLDERS)('blocks non-staff and guest uploads to %s', async (folder) => {
    await assertFails(uploadBytes(ref(storageAs(VIEWER_UID), `${folder}/viewer.png`), PNG, IMAGE))
    await assertFails(uploadBytes(ref(storageAs(null), `${folder}/guest.png`), PNG, IMAGE))
  })

  it('lets anyone read uploaded images', async () => {
    await assertSucceeds(getBytes(ref(storageAs(null), 'covers/existing.png')))
    await assertSucceeds(getBytes(ref(storageAs(null), 'seo/my-post/existing.png')))
  })

  it('accepts nested per-post social images from staff only', async () => {
    await assertSucceeds(uploadBytes(ref(storageAs(EDITOR_UID), 'seo/my-post/social.webp'), PNG, { contentType: 'image/webp' }))
    await assertFails(uploadBytes(ref(storageAs(EDITOR_UID), 'seo/my-post/social.txt'), PNG, { contentType: 'text/plain' }))
    await assertFails(deleteObject(ref(storageAs(VIEWER_UID), 'seo/my-post/existing.png')))
  })

  it('rejects non-image uploads, even from staff', async () => {
    await assertFails(uploadBytes(ref(storageAs(EDITOR_UID), 'covers/notes.txt'), PNG, { contentType: 'text/plain' }))
  })

  it('rejects images of 15MB or more', async () => {
    const tooLarge = new Uint8Array(15 * 1024 * 1024)
    await assertFails(uploadBytes(ref(storageAs(ADMIN_UID), 'covers/huge.png'), tooLarge, IMAGE))
  })

  it('lets staff delete images but not guests', async () => {
    await assertFails(deleteObject(ref(storageAs(null), 'covers/existing.png')))
    await assertSucceeds(deleteObject(ref(storageAs(EDITOR_UID), 'covers/existing.png')))
  })
})

describe('other paths', () => {
  it('denies everything outside the blog image folders', async () => {
    await assertFails(uploadBytes(ref(storageAs(ADMIN_UID), 'private/secret.png'), PNG, IMAGE))
    await assertFails(getBytes(ref(storageAs(ADMIN_UID), 'private/secret.png')))
  })
})
