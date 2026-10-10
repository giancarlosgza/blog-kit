import type { BlogLabelKey } from '#blog/shared/utils/blog-labels'
import { formatLabel, resolveBlogLabels } from '#blog/shared/utils/blog-labels'

/** Interface text in the site's `blog.locale`, with `blog.labels` overrides: `t('minRead', { minutes: 4 })`. */
export function useBlogLabels() {
  const { locale, labels } = useAppConfig().blog
  const dictionary = resolveBlogLabels(locale, labels)

  function t(key: BlogLabelKey, params?: Record<string, string | number>): string {
    return formatLabel(dictionary[key], params)
  }

  return { t, locale }
}
