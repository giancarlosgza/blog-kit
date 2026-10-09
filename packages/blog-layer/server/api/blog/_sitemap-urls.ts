import { getFirestore } from 'firebase-admin/firestore'

/** Firestore reads behind the sitemap, cached for an hour (thrown errors are not cached). */
const readSitemapUrls = defineCachedFunction(async () => {
  const db = getFirestore()
  const [posts, tagsSnapshot, authorsSnapshot, seriesSnapshot] = await Promise.all([
    readPublishedPosts(publishedPostsQuery().orderBy('createdAt', 'desc').limit(SITEMAP_POST_LIMIT)),
    db.collection('tags').get(),
    db.collection('authors').get(),
    db.collection('series').get()
  ])

  return buildSitemapUrls({
    posts,
    tags: tagsSnapshot.docs.map(item => toTag(item.id, item.data())),
    authors: authorsSnapshot.docs.map(item => toAuthor(item.id, item.data())),
    series: seriesSnapshot.docs.map(item => toSeries(item.id, item.data())),
    basePath: useRuntimeConfig().public.blog.basePath
  })
}, {
  name: 'sitemap-urls',
  maxAge: 3600,
  swr: true,
  getKey: () => 'all'
})

/**
 * Sitemap source for `@nuxtjs/sitemap`: post, tag, author and series URLs read with the
 * Admin SDK (`server/utils/sitemap.ts`). Degrades to an empty list if Firestore fails.
 */
export default defineSitemapEventHandler(async () => {
  try {
    return await readSitemapUrls()
  } catch (error) {
    console.log('[sitemap] Firestore read failed', error)
    return []
  }
})
