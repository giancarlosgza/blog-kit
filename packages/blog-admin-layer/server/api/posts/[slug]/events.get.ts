import type { IPostEvent } from '@giancarlosgza/blog-core'
import { Timestamp } from 'firebase-admin/firestore'

const EVENTS_LIMIT = 200

function toMillis(value: unknown): number | null {
  if (value instanceof Timestamp)
    return value.toMillis()
  return typeof value === 'number' ? value : null
}

/** Workflow history, newest first. Posts older than the history get a synthetic "created" entry. */
export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const slug = getRouterParam(event, 'slug', { decode: true })?.trim()
  if (!slug || slug.includes('/'))
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid slug' })

  const db = workflowDb()
  const ref = postRef(db, slug)
  const [postSnap, eventsSnap] = await Promise.all([
    ref.get(),
    ref.collection('events').orderBy('at', 'desc').limit(EVENTS_LIMIT).get()
  ])
  if (!postSnap.exists)
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })

  const events: IPostEvent[] = eventsSnap.docs.map((doc) => {
    const data = doc.data() as IPostEvent
    return { ...data, id: doc.id, at: toMillis(data.at) }
  })

  const createdAt = toMillis(postSnap.get('createdAt'))
  if (createdAt && eventsSnap.size < EVENTS_LIMIT && !events.some(item => item.type === 'created')) {
    const authorName = postSnap.get('authorName') || postSnap.get('author')
    events.push({
      id: 'created',
      type: 'created',
      to: 'draft',
      actor: { uid: '', name: typeof authorName === 'string' && authorName ? authorName : 'Someone' },
      at: createdAt
    })
  }

  return { slug, events }
})
