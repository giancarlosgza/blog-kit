import type { Firestore } from 'firebase-admin/firestore'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { error as logError } from 'firebase-functions/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { publishDuePosts, publishScheduledPost } from '../src'

vi.mock('firebase-functions/logger', () => ({ error: vi.fn(), info: vi.fn() }))

type Doc = Record<string, any>

// Runs the publish steps against a tiny in-memory Firestore
function createFakeDb(initial: Record<string, Doc>) {
  const store = new Map<string, Doc>(Object.entries(initial))
  let autoId = 0

  const applyUpdate = (current: Doc | undefined, patch: Doc) => {
    const next = { ...current }
    for (const [key, value] of Object.entries(patch)) {
      if (value instanceof FieldValue && value.isEqual(FieldValue.delete()))
        delete next[key]
      else
        next[key] = value
    }
    return next
  }
  const snapshot = (path: string) => ({
    id: path.split('/').pop()!,
    exists: store.has(path),
    data: () => store.get(path)
  })
  const docRef = (path: string) => ({
    id: path.split('/').pop()!,
    path,
    collection: (name: string) => collectionRef(`${path}/${name}`),
    get: async () => snapshot(path)
  })
  function collectionRef(path: string) {
    const depth = path.split('/').length + 1
    const filters: [string, string, any][] = []
    const query = {
      where: (field: string, op: string, value: any) => {
        filters.push([field, op, value])
        return query
      },
      orderBy: () => query,
      limit: () => query,
      get: async () => ({
        docs: [...store.keys()]
          .filter(key => key.startsWith(`${path}/`) && key.split('/').length === depth)
          .filter(key => filters.every(([field, op, value]) => {
            const actual = store.get(key)![field]
            return op === '==' ? actual === value : actual && actual.toMillis() <= value.toMillis()
          }))
          .map(key => snapshot(key))
      })
    }
    return {
      doc: (id?: string) => docRef(`${path}/${id ?? `auto-${++autoId}`}`),
      where: query.where
    }
  }

  const db = {
    collection: collectionRef,
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const writes: (() => void)[] = []
      const tx = {
        get: async (ref: { path: string }) => snapshot(ref.path),
        set: (ref: { path: string }, data: Doc, options?: { merge?: boolean }) => writes.push(() => store.set(
          ref.path,
          options?.merge ? { ...store.get(ref.path), ...data } : data
        )),
        update: (ref: { path: string }, data: Doc) => writes.push(() => store.set(ref.path, applyUpdate(store.get(ref.path), data))),
        create: (ref: { path: string }, data: Doc) => writes.push(() => store.set(ref.path, data))
      }
      const result = await fn(tx)
      writes.forEach(write => write())
      return result
    }
  }
  return { db: db as unknown as Firestore, store }
}

const now = Timestamp.fromMillis(1_000_000)

describe('publishScheduledPost', () => {
  let fake: ReturnType<typeof createFakeDb>

  beforeEach(() => {
    fake = createFakeDb({
      'posts/due': {
        title: 'Due',
        isPublished: false,
        status: 'scheduled',
        publishAt: Timestamp.fromMillis(999_000),
        review: { round: 1 }
      },
      'postDrafts/due': { contents: '<p onclick="x()">Hi</p><script>alert(1)</script>' },
      'posts/later': {
        title: 'Later',
        isPublished: false,
        status: 'scheduled',
        publishAt: Timestamp.fromMillis(2_000_000)
      },
      'postDrafts/later': { contents: '<p>Later</p>' },
      'posts/review': { title: 'Review', isPublished: false, status: 'review', publishAt: Timestamp.fromMillis(1) }
    })
  })

  it('sanitizes the draft, publishes and writes a scheduler event', async () => {
    expect(await publishScheduledPost(fake.db, 'due', now)).toBe(true)

    expect(fake.store.get('postContents/due')).toEqual({ contents: '<p>Hi</p>', updatedAt: now })
    expect(fake.store.get('posts/due')).toEqual({ title: 'Due', isPublished: true, status: 'published', updatedAt: now })
    const events = [...fake.store.entries()]
      .filter(([key]) => key.startsWith('posts/due/events/'))
      .map(([, value]) => value)
    expect(events).toEqual([{
      type: 'published',
      from: 'scheduled',
      to: 'published',
      actor: { uid: 'system', name: 'Scheduler' },
      at: now
    }])
  })

  it('is idempotent and skips posts that are not due or not scheduled', async () => {
    await publishScheduledPost(fake.db, 'due', now)
    expect(await publishScheduledPost(fake.db, 'due', now)).toBe(false)
    expect(await publishScheduledPost(fake.db, 'later', now)).toBe(false)
    expect(await publishScheduledPost(fake.db, 'review', now)).toBe(false)
    expect(await publishScheduledPost(fake.db, 'missing', now)).toBe(false)
    expect([...fake.store.keys()].filter(key => key.includes('/events/'))).toHaveLength(1)
    expect(fake.store.get('posts/later')!.status).toBe('scheduled')
  })
})

describe('publishDuePosts', () => {
  it('publishes due posts and reports failures without stopping', async () => {
    const fake = createFakeDb({
      'posts/a': { status: 'scheduled', isPublished: false, publishAt: Timestamp.fromMillis(10) },
      'postDrafts/a': { contents: '<p>A</p>' },
      'posts/no-draft': { status: 'scheduled', isPublished: false, publishAt: Timestamp.fromMillis(20) },
      'posts/b': { status: 'scheduled', isPublished: false, publishAt: Timestamp.fromMillis(3_000_000) }
    })

    expect(await publishDuePosts(fake.db, now)).toEqual({ published: ['a'], failed: ['no-draft'] })
    expect(logError).toHaveBeenCalledTimes(1)
    expect(fake.store.get('posts/a')!.isPublished).toBe(true)
    expect(fake.store.get('posts/no-draft')!.status).toBe('scheduled')
  })
})
