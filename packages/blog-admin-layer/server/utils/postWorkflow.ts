import type { DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore'
import type { H3Event } from 'h3'
import type { IPost, IPostActor, IPostEvent, IPostReview, PostStatus } from '#admin/shared/models/post'
import { getApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { resolvePostStatus } from '#admin/shared/utils/post-status'

export interface IWorkflowCaller {
  uid: string
  role: 'admin' | 'editor'
  actor: IPostActor
}

/** Workflow fields sent back so the client can patch its copy without refetching. */
export interface IWorkflowResponse {
  ok: true
  slug: string
  status: PostStatus
  isPublished: boolean
  publishAt: number | null
  review: IPostReview | null
}

export function workflowDb(): Firestore {
  return getFirestore(getApp())
}

/** Reads `slug` from the JSON body; slashes would address another collection path. */
export async function readWorkflowBody<T extends Record<string, unknown>>(event: H3Event): Promise<{ slug: string } & Partial<T>> {
  const body = await readBody(event)
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  if (!slug || slug.includes('/'))
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid slug' })
  return { ...(body ?? {}), slug }
}

/** Display name for history entries; falls back to the email local part, then the uid. */
export async function resolveActor(db: Firestore, uid: string): Promise<IPostActor> {
  const snap = await db.collection('admins').doc(uid).get()
  const data = snap.data() ?? {}
  const email = typeof data.email === 'string' ? data.email : ''
  const name = [data.displayName, data.name].find(value => typeof value === 'string' && value.trim()) as string | undefined
  return { uid, name: name?.trim() || email.split('@')[0] || uid }
}

export async function requireWorkflowCaller(event: H3Event, adminOnly = false): Promise<IWorkflowCaller> {
  const { uid, role } = adminOnly ? await requireAdmin(event) : await requireStaff(event)
  return { uid, role, actor: await resolveActor(workflowDb(), uid) }
}

export function postRef(db: Firestore, slug: string): DocumentReference {
  return db.collection('posts').doc(slug)
}

/** Loads the post inside a transaction; 404 when it does not exist. */
export async function readPostInTransaction(tx: Transaction, ref: DocumentReference): Promise<IPost> {
  const snap = await tx.get(ref)
  if (!snap.exists)
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  return snap.data() as IPost
}

export function assertStatus(current: PostStatus, allowed: PostStatus[], action: string): void {
  if (!allowed.includes(current))
    throw createError({ statusCode: 409, statusMessage: `Cannot ${action} a post that is ${current}` })
}

/** Queues an event write on the transaction; history is server-written so it can't be forged. */
export function addPostEvent(tx: Transaction, ref: DocumentReference, event: Omit<IPostEvent, 'id' | 'at'>, at: Timestamp): void {
  const data = Object.fromEntries(Object.entries({ ...event, at }).filter(([, value]) => value !== undefined))
  tx.create(ref.collection('events').doc(), data)
}

/** Plain JSON for a review map (Timestamps become Unix ms). */
function serializeReview(review: IPostReview | undefined | null): IPostReview | null {
  if (!review)
    return null
  const toMs = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : value)
  return { ...review, submittedAt: toMs(review.submittedAt) as number, ...(review.requestedAt ? { requestedAt: toMs(review.requestedAt) as number } : {}) }
}

export function workflowResponse(slug: string, post: Partial<IPost>): IWorkflowResponse {
  const publishAt = post.publishAt instanceof Timestamp ? post.publishAt.toMillis() : null
  return {
    ok: true,
    slug,
    status: resolvePostStatus({ status: post.status, isPublished: post.isPublished === true }),
    isPublished: post.isPublished === true,
    publishAt,
    review: serializeReview(post.review)
  }
}

/** Trimmed note capped at `max`; `required` turns an empty note into a 400. */
export function readNote(value: unknown, max: number, required = false): string | undefined {
  const note = typeof value === 'string' ? value.trim() : ''
  if (required && !note)
    throw createError({ statusCode: 400, statusMessage: 'A note is required' })
  if (note.length > max)
    throw createError({ statusCode: 400, statusMessage: `Note must be ${max} characters or fewer` })
  return note || undefined
}
