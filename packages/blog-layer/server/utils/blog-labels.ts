import type { BlogLabelKey } from '#blog/shared/utils/blog-labels'
import { formatLabel, resolveBlogLabels } from '#blog/shared/utils/blog-labels'

/** Interface text for server responses (error messages), in the site's `blog.locale`. */
export function blogLabel(key: BlogLabelKey, params?: Record<string, string | number>): string {
  const { locale, labels } = useAppConfig().blog
  return formatLabel(resolveBlogLabels(locale, labels)[key], params)
}
