import type { IPost, ISeries } from '@giancarlosgza/blog-core'
import type { IPostEditorForm } from '#admin/app/composables/usePostEditor'
import { toSlug } from '@giancarlosgza/blog-core'

/** Interfaces */
type TSeriesForm = Pick<IPostEditorForm, 'seriesSlug' | 'seriesOrder' | 'isNewSeries' | 'newSeriesName' | 'newSeriesDescription'>
type TFeaturedForm = Pick<IPostEditorForm, 'featured' | 'featuredOrder'>

export interface ISeriesPartPreview {
  slug: string
  title: string
  seriesOrder: number | null
  isPublished: boolean
  isCurrent: boolean
}

export interface IPostSeriesPayload {
  fields: Partial<IPost>
  removed: (keyof IPost)[]
  /** New `series/{slug}` doc to create before the post is saved; `null` when the series exists. */
  create: Pick<ISeries, 'name' | 'slug' | 'description'> | null
}

/** Helpers */
function postSlug(post: Pick<IPost, 'id' | 'slug'>): string {
  return post.id || post.slug || ''
}

/** Positive whole number (part numbers and the featured order start at 1). */
export function isValidOrder(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
}

/** Number input value → number, or `null` when blank (`v-model.number` leaves `''` behind). */
export function toOrderValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '')
    return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

/** One past the highest part among the series' other posts (1 for an empty series). */
export function nextSeriesOrder(parts: Pick<IPost, 'id' | 'slug' | 'seriesOrder'>[], currentSlug: string): number {
  const orders = parts
    .filter(part => postSlug(part) !== currentSlug)
    .map(part => part.seriesOrder)
    .filter(isValidOrder)
  return orders.length ? Math.max(...orders) + 1 : 1
}

/**
 * The series as it reads after saving: the other posts plus the current one with the form's
 * title and part number, ordered by part (unnumbered last, ties by title).
 */
export function seriesPartsPreview(
  parts: IPost[],
  current: { slug: string, title: string, seriesOrder: number | null, isPublished: boolean }
): ISeriesPartPreview[] {
  const others: ISeriesPartPreview[] = parts
    .filter(part => postSlug(part) !== current.slug)
    .map(part => ({
      slug: postSlug(part),
      title: part.title || postSlug(part),
      seriesOrder: isValidOrder(part.seriesOrder) ? part.seriesOrder : null,
      isPublished: part.isPublished === true,
      isCurrent: false
    }))
  const self: ISeriesPartPreview = {
    slug: current.slug,
    title: current.title.trim() || current.slug,
    seriesOrder: isValidOrder(current.seriesOrder) ? current.seriesOrder : null,
    isPublished: current.isPublished,
    isCurrent: true
  }
  return [...others, self].sort((a, b) =>
    (a.seriesOrder ?? Number.POSITIVE_INFINITY) - (b.seriesOrder ?? Number.POSITIVE_INFINITY)
    || a.title.localeCompare(b.title))
}

/** Slug the post is saved under: the picked series, or the slug of the new series name. */
export function resolveSeriesSlug(form: TSeriesForm): string {
  return form.isNewSeries ? toSlug(form.newSeriesName) : form.seriesSlug
}

/** Editor form series/featured fields hydrated from a post doc. */
export function postSeriesFormFields(post: IPost): Pick<IPostEditorForm, 'seriesSlug' | 'seriesOrder' | 'featured' | 'featuredOrder'> {
  return {
    seriesSlug: post.seriesSlug || '',
    seriesOrder: isValidOrder(post.seriesOrder) ? post.seriesOrder : null,
    featured: post.featured === true,
    featuredOrder: isValidOrder(post.featuredOrder) ? post.featuredOrder : null
  }
}

/**
 * Series fields to write or delete (like `postSeoPayload`). A new series whose slug matches an
 * existing one joins it instead of overwriting its name. Throws on an invalid name or part.
 */
export function postSeriesPayload(form: TSeriesForm, existing: Pick<ISeries, 'id' | 'slug'>[] = []): IPostSeriesPayload {
  const seriesSlug = resolveSeriesSlug(form)
  if (form.isNewSeries && !seriesSlug)
    throw new Error('Series name needs at least one letter or number.')
  if (!seriesSlug)
    return { fields: {}, removed: ['seriesSlug', 'seriesOrder'], create: null }
  if (!isValidOrder(form.seriesOrder))
    throw new Error('Series part must be a whole number from 1.')

  const exists = existing.some(series => (series.id || series.slug) === seriesSlug)
  const description = form.newSeriesDescription.trim()
  const create = form.isNewSeries && !exists
    ? { name: form.newSeriesName.trim(), slug: seriesSlug, ...(description ? { description } : {}) }
    : null
  return { fields: { seriesSlug, seriesOrder: form.seriesOrder }, removed: [], create }
}

/** Featured fields to write or delete; `featured: false` removes both. Throws on an invalid order. */
export function postFeaturedPayload(form: TFeaturedForm): { fields: Partial<IPost>, removed: (keyof IPost)[] } {
  if (!form.featured)
    return { fields: {}, removed: ['featured', 'featuredOrder'] }
  if (form.featuredOrder === null)
    return { fields: { featured: true }, removed: ['featuredOrder'] }
  if (!isValidOrder(form.featuredOrder))
    throw new Error('Featured order must be a whole number from 1.')
  return { fields: { featured: true, featuredOrder: form.featuredOrder }, removed: [] }
}
