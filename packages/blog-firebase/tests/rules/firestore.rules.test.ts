import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

// Blog content is public once published; drafts, staff records and writes stay
// behind the `admins/{uid}.role` check (admin | editor). The Admin SDK used by
// the server routes bypasses these rules entirely.
const PROJECT_ID = 'demo-blog-kit-firestore'
const ADMIN_UID = 'admin-1'
const EDITOR_UID = 'editor-1'
const VIEWER_UID = 'viewer-1'

let testEnv: RulesTestEnvironment

function asAdmin() {
  return testEnv.authenticatedContext(ADMIN_UID).firestore()
}
function asEditor() {
  return testEnv.authenticatedContext(EDITOR_UID).firestore()
}
function asViewer() {
  return testEnv.authenticatedContext(VIEWER_UID).firestore()
}
function asGuest() {
  return testEnv.unauthenticatedContext().firestore()
}

async function seedData() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'admins', ADMIN_UID), { role: 'admin', email: 'admin@example.com' })
    await setDoc(doc(db, 'admins', EDITOR_UID), { role: 'editor', email: 'editor@example.com' })
    await setDoc(doc(db, 'posts', 'published-post'), { title: 'Live', isPublished: true })
    await setDoc(doc(db, 'posts', 'draft-post'), { title: 'Draft', isPublished: false })
    await setDoc(doc(db, 'postContents', 'published-post'), { contents: '<p>Live</p>' })
    await setDoc(doc(db, 'postContents', 'draft-post'), { contents: '<p>Old</p>' })
    await setDoc(doc(db, 'postDrafts', 'published-post'), { contents: '<p>WIP</p>' })
    await setDoc(doc(db, 'posts', 'review-post'), { title: 'Review', isPublished: false, status: 'review', review: { round: 1 } })
    await setDoc(doc(db, 'posts', 'draft-post', 'events', 'event-1'), { type: 'submitted', from: 'draft', to: 'review', actor: { uid: EDITOR_UID, name: 'Editor' } })
    await setDoc(doc(db, 'authors', 'author-1'), { name: 'Author' })
    await setDoc(doc(db, 'tags', 'CSS'), { name: 'CSS', count: 1 })
    await setDoc(doc(db, 'series', 'color-basics'), { name: 'Color basics', slug: 'color-basics' })
    await setDoc(doc(db, 'settings', 'general'), { blogName: 'My Blog' })
    await setDoc(doc(db, 'ai_recommendations', 'chat-1'), { kind: 'recommendations', prompt: 'October content plan', model: 'gemini-3.8-flash', pinned: [], createdAt: 1 })
  })
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') }
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedData()
})

afterAll(async () => {
  await testEnv?.cleanup()
})

describe('posts', () => {
  it('lets anyone read a published post', async () => {
    await assertSucceeds(getDoc(doc(asGuest(), 'posts', 'published-post')))
  })

  it('hides unpublished posts from guests and non-staff users', async () => {
    await assertFails(getDoc(doc(asGuest(), 'posts', 'draft-post')))
    await assertFails(getDoc(doc(asViewer(), 'posts', 'draft-post')))
  })

  it('lets staff read unpublished posts', async () => {
    await assertSucceeds(getDoc(doc(asEditor(), 'posts', 'draft-post')))
    await assertSucceeds(getDoc(doc(asAdmin(), 'posts', 'draft-post')))
  })

  it('lets staff list every post but not guests', async () => {
    await assertSucceeds(getDocs(collection(asEditor(), 'posts')))
    await assertFails(getDocs(collection(asGuest(), 'posts')))
  })

  it('only lets staff write posts', async () => {
    await assertSucceeds(setDoc(doc(asEditor(), 'posts', 'new-post'), { title: 'New', isPublished: false }))
    await assertFails(setDoc(doc(asViewer(), 'posts', 'new-post'), { title: 'New', isPublished: false }))
    await assertFails(setDoc(doc(asGuest(), 'posts', 'new-post'), { title: 'New', isPublished: false }))
  })
})

describe('posts workflow', () => {
  it('lets an editor save a draft', async () => {
    await assertSucceeds(setDoc(doc(asEditor(), 'posts', 'draft-post'), { title: 'Draft v2', updatedAt: 1 }, { merge: true }))
    await assertSucceeds(setDoc(doc(asEditor(), 'posts', 'new-draft'), { title: 'New', isPublished: false, status: 'draft', createdAt: 1 }))
    // Editing a live post leaves isPublished untouched, so it is still allowed
    await assertSucceeds(setDoc(doc(asEditor(), 'posts', 'published-post'), { title: 'Live v2' }, { merge: true }))
    await assertSucceeds(setDoc(doc(asEditor(), 'posts', 'review-post'), { shortText: 'Tweak' }, { merge: true }))
  })

  it('stops an editor from publishing or scheduling with a direct write', async () => {
    await assertFails(setDoc(doc(asEditor(), 'posts', 'draft-post'), { isPublished: true }, { merge: true }))
    await assertFails(setDoc(doc(asEditor(), 'posts', 'draft-post'), { status: 'published' }, { merge: true }))
    await assertFails(setDoc(doc(asEditor(), 'posts', 'draft-post'), { status: 'scheduled', publishAt: 1 }, { merge: true }))
    await assertFails(setDoc(doc(asEditor(), 'posts', 'new-live'), { title: 'Sneaky', isPublished: true }))
    await assertFails(setDoc(doc(asEditor(), 'posts', 'new-live'), { title: 'Sneaky', isPublished: false, status: 'scheduled' }))
  })

  it('stops an editor from moving the workflow or unpublishing', async () => {
    await assertFails(setDoc(doc(asEditor(), 'posts', 'review-post'), { status: 'draft' }, { merge: true }))
    await assertFails(setDoc(doc(asEditor(), 'posts', 'review-post'), { review: { round: 5 } }, { merge: true }))
    await assertFails(setDoc(doc(asEditor(), 'posts', 'published-post'), { isPublished: false }, { merge: true }))
  })

  it('lets an admin publish with a direct write', async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), 'posts', 'draft-post'), { isPublished: true, status: 'published' }, { merge: true }))
    await assertSucceeds(setDoc(doc(asAdmin(), 'posts', 'review-post'), { status: 'scheduled', publishAt: 1 }, { merge: true }))
  })

  it('lets staff read the history but nobody write it from a client', async () => {
    await assertSucceeds(getDoc(doc(asEditor(), 'posts', 'draft-post', 'events', 'event-1')))
    await assertSucceeds(getDocs(collection(asAdmin(), 'posts', 'draft-post', 'events')))
    await assertFails(setDoc(doc(asEditor(), 'posts', 'draft-post', 'events', 'fake'), { type: 'approved' }))
    await assertFails(setDoc(doc(asAdmin(), 'posts', 'draft-post', 'events', 'fake'), { type: 'approved' }))
    await assertFails(deleteDoc(doc(asAdmin(), 'posts', 'draft-post', 'events', 'event-1')))
  })

  it('hides the history from guests and non-staff users', async () => {
    await assertFails(getDocs(collection(asGuest(), 'posts', 'published-post', 'events')))
    await assertFails(getDoc(doc(asGuest(), 'posts', 'draft-post', 'events', 'event-1')))
    await assertFails(getDoc(doc(asViewer(), 'posts', 'draft-post', 'events', 'event-1')))
  })
})

describe('postContents', () => {
  it('is public only when the parent post is published', async () => {
    await assertSucceeds(getDoc(doc(asGuest(), 'postContents', 'published-post')))
    await assertFails(getDoc(doc(asGuest(), 'postContents', 'draft-post')))
    await assertFails(getDoc(doc(asGuest(), 'postContents', 'missing-post')))
  })

  it('lets staff read any body', async () => {
    await assertSucceeds(getDoc(doc(asEditor(), 'postContents', 'draft-post')))
  })

  it('only lets admins write the public body directly', async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), 'postContents', 'draft-post'), { contents: '<p>New</p>' }))
    await assertFails(setDoc(doc(asEditor(), 'postContents', 'published-post'), { contents: '<p>New</p>' }))
    await assertFails(setDoc(doc(asViewer(), 'postContents', 'draft-post'), { contents: '<p>New</p>' }))
  })
})

describe('postDrafts', () => {
  it('is never readable outside staff, even for published posts', async () => {
    await assertFails(getDoc(doc(asGuest(), 'postDrafts', 'published-post')))
    await assertFails(getDoc(doc(asViewer(), 'postDrafts', 'published-post')))
  })

  it('lets staff read and write drafts', async () => {
    await assertSucceeds(getDoc(doc(asEditor(), 'postDrafts', 'published-post')))
    await assertSucceeds(setDoc(doc(asEditor(), 'postDrafts', 'published-post'), { contents: '<p>Edit</p>' }))
  })
})

describe('authors and tags', () => {
  it('are publicly readable', async () => {
    await assertSucceeds(getDoc(doc(asGuest(), 'authors', 'author-1')))
    await assertSucceeds(getDocs(collection(asGuest(), 'tags')))
  })

  it('only accept staff writes', async () => {
    await assertSucceeds(setDoc(doc(asEditor(), 'authors', 'author-2'), { name: 'New' }))
    await assertSucceeds(setDoc(doc(asEditor(), 'tags', 'Design'), { name: 'Design', count: 0 }))
    await assertFails(setDoc(doc(asViewer(), 'authors', 'author-2'), { name: 'New' }))
    await assertFails(deleteDoc(doc(asGuest(), 'tags', 'CSS')))
  })
})

describe('series', () => {
  it('is publicly readable', async () => {
    await assertSucceeds(getDoc(doc(asGuest(), 'series', 'color-basics')))
    await assertSucceeds(getDocs(collection(asGuest(), 'series')))
  })

  it('only accepts staff writes', async () => {
    await assertSucceeds(setDoc(doc(asEditor(), 'series', 'css-layout'), { name: 'CSS layout', slug: 'css-layout' }))
    await assertSucceeds(setDoc(doc(asAdmin(), 'series', 'color-basics'), { name: 'Color basics', slug: 'color-basics', description: 'Start here' }))
    await assertFails(setDoc(doc(asViewer(), 'series', 'css-layout'), { name: 'CSS layout', slug: 'css-layout' }))
    await assertFails(setDoc(doc(asGuest(), 'series', 'css-layout'), { name: 'CSS layout', slug: 'css-layout' }))
    await assertFails(deleteDoc(doc(asViewer(), 'series', 'color-basics')))
    await assertSucceeds(deleteDoc(doc(asEditor(), 'series', 'color-basics')))
  })
})

describe('ai recommendations', () => {
  // Saved Gemini chats are a staff tool: editors and admins share them, nobody else sees them.
  it('lets staff read, list and write saved chats', async () => {
    await assertSucceeds(getDoc(doc(asEditor(), 'ai_recommendations', 'chat-1')))
    await assertSucceeds(getDocs(collection(asAdmin(), 'ai_recommendations')))
    await assertSucceeds(setDoc(doc(asEditor(), 'ai_recommendations', 'chat-2'), { kind: 'analysis', prompt: 'Coverage', model: 'gemini-3.8-flash', pinned: [], createdAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(asAdmin(), 'ai_recommendations', 'chat-1'), { pinned: [{ id: 'item:Liquid glass in CSS', label: 'Liquid glass in CSS', meta: 'Deep dive · Week 2', source: 'item' }] }))
    await assertSucceeds(deleteDoc(doc(asEditor(), 'ai_recommendations', 'chat-1')))
  })

  it('hides saved chats from guests and non-staff users', async () => {
    await assertFails(getDoc(doc(asViewer(), 'ai_recommendations', 'chat-1')))
    await assertFails(getDocs(collection(asViewer(), 'ai_recommendations')))
    await assertFails(getDoc(doc(asGuest(), 'ai_recommendations', 'chat-1')))
    await assertFails(getDocs(collection(asGuest(), 'ai_recommendations')))
  })

  it('blocks writes from guests and non-staff users', async () => {
    const payload = { kind: 'recommendations', prompt: 'Sneaky', model: 'gemini-3.8-flash', pinned: [], createdAt: serverTimestamp() }
    await assertFails(setDoc(doc(asViewer(), 'ai_recommendations', 'chat-3'), payload))
    await assertFails(setDoc(doc(asGuest(), 'ai_recommendations', 'chat-3'), payload))
    await assertFails(updateDoc(doc(asViewer(), 'ai_recommendations', 'chat-1'), { pinned: [] }))
    await assertFails(deleteDoc(doc(asGuest(), 'ai_recommendations', 'chat-1')))
  })
})

describe('settings', () => {
  it('is publicly readable', async () => {
    await assertSucceeds(getDoc(doc(asGuest(), 'settings', 'general')))
  })

  it('only accepts admin writes', async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), 'settings', 'general'), { blogName: 'Renamed' }))
    await assertFails(setDoc(doc(asEditor(), 'settings', 'general'), { blogName: 'Renamed' }))
  })
})

describe('admins', () => {
  it('lets a signed-in user read their own role doc', async () => {
    await assertSucceeds(getDoc(doc(asEditor(), 'admins', EDITOR_UID)))
    // Middleware reads the doc for non-staff users too, then sends them to /errors/403
    await assertSucceeds(getDoc(doc(asViewer(), 'admins', VIEWER_UID)))
  })

  it('hides admin records from guests and other non-staff users', async () => {
    await assertFails(getDoc(doc(asGuest(), 'admins', ADMIN_UID)))
    await assertFails(getDoc(doc(asViewer(), 'admins', ADMIN_UID)))
  })

  it('lets staff read another staff doc', async () => {
    await assertSucceeds(getDoc(doc(asEditor(), 'admins', ADMIN_UID)))
  })

  it('only lets admins list staff emails', async () => {
    await assertSucceeds(getDocs(collection(asAdmin(), 'admins')))
    await assertFails(getDocs(collection(asEditor(), 'admins')))
    await assertFails(getDocs(collection(asGuest(), 'admins')))
  })

  it('only lets admins write role docs', async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), 'admins', 'new-uid'), { role: 'editor' }))
    await assertFails(setDoc(doc(asEditor(), 'admins', EDITOR_UID), { role: 'admin' }))
    await assertFails(setDoc(doc(asViewer(), 'admins', VIEWER_UID), { role: 'admin' }))
  })
})
