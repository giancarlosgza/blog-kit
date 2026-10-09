import type { IMediaFile, MediaFolder, MediaUsageMap } from '#admin/shared/models/media'
import { MEDIA_FOLDERS } from '#admin/shared/models/media'
import { isMediaFolder, isMediaInUse } from '#admin/shared/utils/media'

export type MediaUsageFilter = 'used' | 'unused'
export type MediaSort = 'newest' | 'oldest' | 'largest' | 'smallest' | 'name'
export type MediaView = 'grid' | 'list'

/** Media library filters, mirrored in the URL as `?q=&folder=&usage=&sort=&view=`. */
export interface IMediaFilters {
  q: string | null
  folder: MediaFolder | null
  usage: MediaUsageFilter | null
  sort: MediaSort
  view: MediaView
}

export interface IMediaFilterOption<T extends string> {
  value: T
  label: string
}

export const DEFAULT_MEDIA_SORT: MediaSort = 'newest'
export const DEFAULT_MEDIA_VIEW: MediaView = 'grid'

export const MEDIA_USAGE_OPTIONS: IMediaFilterOption<MediaUsageFilter>[] = [
  { value: 'used', label: 'Used' },
  { value: 'unused', label: 'Unused' }
]

export const MEDIA_SORT_OPTIONS: IMediaFilterOption<MediaSort>[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'largest', label: 'Largest' },
  { value: 'smallest', label: 'Smallest' },
  { value: 'name', label: 'Name A–Z' }
]

export const MEDIA_VIEW_OPTIONS: IMediaFilterOption<MediaView>[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' }
]

/** The URL query keys owned by the media filters. */
export const MEDIA_FILTER_QUERY_KEYS = ['q', 'folder', 'usage', 'sort', 'view'] as const

export function emptyMediaFilters(view: MediaView = DEFAULT_MEDIA_VIEW): IMediaFilters {
  return { q: null, folder: null, usage: null, sort: DEFAULT_MEDIA_SORT, view }
}

function queryString(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string')
    return null
  return raw.trim() || null
}

function isOption<T extends string>(options: IMediaFilterOption<T>[], value: string | null): value is T {
  return value !== null && options.some(option => option.value === value)
}

/** Reads the filters from a route query, dropping unknown folder/usage/sort/view values. */
export function parseMediaFilters(query: Record<string, unknown>): IMediaFilters {
  const folder = queryString(query.folder)
  const usage = queryString(query.usage)
  const sort = queryString(query.sort)
  const view = queryString(query.view)
  return {
    q: queryString(query.q),
    folder: isMediaFolder(folder) ? folder : null,
    usage: isOption(MEDIA_USAGE_OPTIONS, usage) ? usage : null,
    sort: isOption(MEDIA_SORT_OPTIONS, sort) ? sort : DEFAULT_MEDIA_SORT,
    view: isOption(MEDIA_VIEW_OPTIONS, view) ? view : DEFAULT_MEDIA_VIEW
  }
}

/** Serializes the filters to query params, leaving out empty values and defaults. */
export function mediaFiltersToQuery(filters: IMediaFilters): Record<string, string> {
  const query: Record<string, string> = {}
  const q = filters.q?.trim()
  if (q)
    query.q = q
  if (filters.folder)
    query.folder = filters.folder
  if (filters.usage)
    query.usage = filters.usage
  if (filters.sort !== DEFAULT_MEDIA_SORT)
    query.sort = filters.sort
  if (filters.view !== DEFAULT_MEDIA_VIEW)
    query.view = filters.view
  return query
}

/** Replaces the filter keys of `current` with `filters`, keeping unrelated params. */
export function mergeMediaFiltersQuery<T>(current: Record<string, T>, filters: IMediaFilters): Record<string, T | string> {
  const rest: Record<string, T | string> = { ...current }
  for (const key of MEDIA_FILTER_QUERY_KEYS)
    delete rest[key]
  return { ...rest, ...mediaFiltersToQuery(filters) }
}

/** Whether anything narrows or reorders the files; the view alone does not count. */
export function hasActiveMediaFilters(filters: IMediaFilters): boolean {
  return Boolean(filters.q?.trim() || filters.folder || filters.usage || filters.sort !== DEFAULT_MEDIA_SORT)
}

/** File count per folder, plus `all`. */
export function countMediaByFolder(files: IMediaFile[]): Record<MediaFolder | 'all', number> {
  const counts = Object.fromEntries([['all', files.length], ...MEDIA_FOLDERS.map(folder => [folder, 0])]) as Record<MediaFolder | 'all', number>
  for (const file of files)
    counts[file.folder] = (counts[file.folder] ?? 0) + 1
  return counts
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function filterMediaFiles(files: IMediaFile[], filters: IMediaFilters, usage: MediaUsageMap): IMediaFile[] {
  const terms = normalizeText(filters.q?.trim() ?? '').split(/\s+/).filter(Boolean)
  return files.filter((file) => {
    if (filters.folder && file.folder !== filters.folder)
      return false
    if (filters.usage) {
      const inUse = isMediaInUse(file.path, usage)
      if ((filters.usage === 'used') !== inUse)
        return false
    }
    if (!terms.length)
      return true
    const haystack = normalizeText(file.path)
    return terms.every(term => haystack.includes(term))
  })
}

function compareNames(a: IMediaFile, b: IMediaFile): number {
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true }) || a.path.localeCompare(b.path)
}

/** Returns a sorted copy; ties fall back to name so the order is deterministic. */
export function sortMediaFiles(files: IMediaFile[], sort: MediaSort = DEFAULT_MEDIA_SORT): IMediaFile[] {
  const by = (read: (file: IMediaFile) => number, direction: 1 | -1) =>
    (a: IMediaFile, b: IMediaFile) => (read(a) - read(b)) * direction || compareNames(a, b)
  const updated = (file: IMediaFile) => file.updated ?? 0
  const size = (file: IMediaFile) => file.size

  const compare = {
    newest: by(updated, -1),
    oldest: by(updated, 1),
    largest: by(size, -1),
    smallest: by(size, 1),
    name: compareNames
  }[sort] ?? by(updated, -1)

  return [...files].sort(compare)
}

export function applyMediaFilters(files: IMediaFile[], filters: IMediaFilters, usage: MediaUsageMap): IMediaFile[] {
  return sortMediaFiles(filterMediaFiles(files, filters, usage), filters.sort)
}

/** Upper-cased extension for the spec line, e.g. `WEBP`. */
export function mediaExtension(file: Pick<IMediaFile, 'name' | 'contentType'>): string {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.') + 1) : ''
  return (ext || file.contentType?.split('/')[1] || 'file').toUpperCase()
}

export function isImageFile(file: Pick<IMediaFile, 'contentType' | 'name'>): boolean {
  return file.contentType?.startsWith('image/') ?? /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(file.name)
}

export const MEDIA_USAGE_KIND_LABELS = {
  'post-cover': 'Post cover',
  'post-body': 'Post body',
  'post-seo': 'SEO image',
  'author-photo': 'Author photo',
  'logo': 'Logo'
} as const
