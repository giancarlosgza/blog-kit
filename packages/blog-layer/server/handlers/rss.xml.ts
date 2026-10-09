import { getFirestore } from 'firebase-admin/firestore'

/**
 * RSS 2.0 feed of the latest published, indexable posts with their sanitized bodies, served at
 * `<basePath>/rss.xml` (registered by `blog-module.ts`). Cached like the read endpoints; a failed
 * read answers an uncached 503.
 */
export default defineCachedEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const siteUrl = (getSiteConfig(event).url || runtimeConfig.siteUrl).replace(/\/+$/, '')
  const basePath = runtimeConfig.public.blog.basePath
  const brand = useAppConfig().blog

  try {
    const db = getFirestore()
    const [settingsSnapshot, posts] = await Promise.all([
      db.collection('settings').doc('general').get(),
      readPublishedPosts(publishedPostsQuery().orderBy('createdAt', 'desc').limit(RSS_QUERY_LIMIT))
    ])
    const feedPosts = selectFeedPosts(posts)
    const contentSnapshots = feedPosts.length
      ? await db.getAll(...feedPosts.map(post => db.collection('postContents').doc(postSlug(post))))
      : []

    const settingsData = settingsSnapshot.data()
    const settings = settingsData ? toSettings(settingsData) : null
    const items = feedPosts.map((post, index) => buildRssItem({
      post,
      siteUrl,
      basePath,
      contents: String(contentSnapshots[index]?.data()?.contents ?? ''),
      defaultAuthor: brand.defaultAuthor
    }))

    setResponseHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
    return buildRssFeed({
      title: settings?.blogName?.trim() || brand.name,
      description: settings?.blogDescription?.trim() || brand.description,
      siteUrl: toBlogUrl(siteUrl, basePath),
      feedUrl: toBlogUrl(siteUrl, basePath, '/rss.xml'),
      imageUrl: settings?.logoURL,
      lastBuildDate: latestPostDate(feedPosts),
      items
    })
  } catch (error) {
    failRead('rss', error)
  }
}, {
  name: 'rss',
  maxAge: 300,
  swr: true,
  getKey: () => 'feed'
})
