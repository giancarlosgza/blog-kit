import type { IAuthor, IPost } from '@giancarlosgza/blog-core'
import type { IPostPageResponse, IPostSeries } from '#blog/shared/types/api'
import { getFirestore } from 'firebase-admin/firestore'

/** Constants */
const RELATED_LIMIT = 3
// array-contains-any accepts at most 10 values.
const RELATED_MAX_TAGS = 10

/** Helpers */
// Secondary reads degrade to empty (as the old page's timeouts did) instead of failing the article.
function optional<T>(label: string, read: Promise<T>, fallback: T): Promise<T> {
  return read.catch((error) => {
    console.log(`[post] ${label} read failed`, error)
    return fallback
  })
}

async function readAuthor(uid: string | undefined): Promise<IAuthor | null> {
  if (!uid)
    return null

  const snapshot = await getFirestore().collection('authors').doc(uid).get()
  const data = snapshot.data()
  return data ? toAuthor(snapshot.id, data) : null
}

async function readRelated(post: IPost, slug: string): Promise<IPost[]> {
  const tags = (post.tags ?? []).slice(0, RELATED_MAX_TAGS)
  if (!tags.length)
    return []

  // One extra so the current post can be dropped.
  const posts = await readPublishedPosts(
    publishedPostsQuery()
      .where('tags', 'array-contains-any', tags)
      .orderBy('createdAt', 'desc')
      .limit(RELATED_LIMIT + 1)
  )
  return posts.filter(item => (item.id ?? item.slug) !== slug).slice(0, RELATED_LIMIT)
}

async function readSibling(createdAt: unknown, direction: 'older' | 'newer'): Promise<IPost | null> {
  if (createdAt == null)
    return null

  const query = direction === 'older'
    ? publishedPostsQuery().where('createdAt', '<', createdAt).orderBy('createdAt', 'desc')
    : publishedPostsQuery().where('createdAt', '>', createdAt).orderBy('createdAt', 'asc')
  const [sibling] = await readPublishedPosts(query.limit(1))
  return sibling ?? null
}

async function readPostSeries(post: IPost, slug: string): Promise<IPostSeries | null> {
  const seriesSlug = post.seriesSlug?.trim()
  if (!seriesSlug || seriesSlug.includes('/'))
    return null

  const [series, posts] = await Promise.all([readSeries(seriesSlug), readSeriesPosts(seriesSlug)])
  return series ? toPostSeries(series, posts, slug) : null
}

/**
 * A published post with everything its page renders. The body is sanitized and anchored here,
 * so the client never receives raw Firestore HTML and ships no sanitizer.
 * 404 when the post is missing or unpublished; its body is only read once the post is public.
 */
export default defineCachedEventHandler(async (event): Promise<IPostPageResponse> => {
  const slug = getRouterParam(event, 'slug', { decode: true })?.trim() ?? ''
  // A "/" would address a subcollection path, not a post id.
  if (!slug || slug.includes('/'))
    notFound('Post not found')

  try {
    const db = getFirestore()
    const postSnapshot = await db.collection('posts').doc(slug).get()
    const data = postSnapshot.data()
    const post = toPublishedPost(postSnapshot.id, data)
    if (!post)
      notFound('Post not found')

    const [contentSnapshot, author, related, older, newer, series] = await Promise.all([
      db.collection('postContents').doc(slug).get(),
      readAuthor(post.authorUuid),
      optional('related', readRelated(post, slug), []),
      // Compared against the stored value (ms number or legacy Timestamp), not the serialized one.
      optional('older', readSibling(data?.createdAt, 'older'), null),
      optional('newer', readSibling(data?.createdAt, 'newer'), null),
      optional('series', readPostSeries(post, slug), null)
    ])

    const rawContents = String(contentSnapshot.data()?.contents ?? '')
    const article = addHeadingAnchors(sanitizeBlogHtml(rawContents))

    return {
      post,
      contents: article.html,
      headings: article.headings,
      readingTime: estimateReadingTime(article.html),
      excerpt: htmlToExcerpt(rawContents),
      author,
      related,
      older,
      newer,
      series
    }
  } catch (error) {
    failRead('post', error)
  }
}, {
  name: 'blog-post',
  maxAge: 300,
  swr: true,
  getKey: event => encodeKeyPart(getRouterParam(event, 'slug', { decode: true })?.trim())
})
