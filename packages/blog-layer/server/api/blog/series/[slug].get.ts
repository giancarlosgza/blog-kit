import type { H3Event } from 'h3'
import type { ISeriesPageResponse } from '#blog/shared/types/api'

function readSlug(event: H3Event): string {
  return getRouterParam(event, 'slug', { decode: true })?.trim() ?? ''
}

/** A series (`series/{slug}`) and its published parts in reading order. 404 for an unknown series. */
export default defineCachedEventHandler(async (event): Promise<ISeriesPageResponse> => {
  const slug = readSlug(event)
  // A "/" would address a subcollection path, not a series id.
  if (!slug || slug.includes('/'))
    notFound(blogLabel('seriesNotFound'))

  try {
    const [series, posts] = await Promise.all([readSeries(slug), readSeriesPosts(slug)])
    if (!series)
      notFound(blogLabel('seriesNotFound'))

    return { series, posts }
  } catch (error) {
    failRead('series', error)
  }
}, {
  name: 'blog-series',
  maxAge: 300,
  swr: true,
  getKey: event => encodeKeyPart(readSlug(event))
})
