import type { ITagsResponse } from '#blog/shared/types/api'
import { getFirestore } from 'firebase-admin/firestore'

/** Every tag, most used first (home tag filter). */
export default defineCachedEventHandler(async (): Promise<ITagsResponse> => {
  try {
    const snapshot = await getFirestore().collection('tags').orderBy('count', 'desc').get()
    return { tags: snapshot.docs.map(item => toTag(item.id, item.data())) }
  } catch (error) {
    failRead('tags', error)
  }
}, {
  name: 'blog-tags',
  maxAge: 300,
  swr: true,
  getKey: () => 'all'
})
