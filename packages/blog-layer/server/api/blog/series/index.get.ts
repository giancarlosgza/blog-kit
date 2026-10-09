import type { ISeriesListResponse } from '#blog/shared/types/api'

/** Series names by slug for the post card badge. */
export default defineCachedEventHandler(async (): Promise<ISeriesListResponse> => {
  try {
    return { series: await readSeriesList() }
  } catch (error) {
    failRead('series-list', error)
  }
}, {
  name: 'blog-series-list',
  maxAge: 300,
  swr: true,
  getKey: () => 'all'
})
