/**
 * Shared layout view (table vs grid) for listing pages, mirrored in the URL as `?layout=`.
 *
 * The URL is the source of truth whenever the param is present, so a copied link opens in the
 * layout it was shared in. Without it the global state decides, which keeps the choice sticky
 * while moving between listing pages. Toggling writes both, and `table` — the default — is left
 * out of the URL so only a deliberate grid view shows up there.
 */
export function useTableLayoutActive() {
  const route = useRoute()
  const router = useRouter()
  const layoutState = useState<boolean>('layout', () => true)

  return computed<boolean>({
    get: () => {
      const layout = route.query.layout

      if (layout === 'table')
        return true

      if (layout === 'grid')
        return false

      return layoutState.value
    },
    set: (isTableLayout: boolean) => {
      layoutState.value = isTableLayout

      const { layout, ...query } = route.query
      const nextLayout = isTableLayout ? undefined : 'grid'

      if (layout === nextLayout)
        return

      // A view toggle is not a navigation step, so it replaces the entry instead of stacking one.
      router.replace({
        query: nextLayout ? { ...query, layout: nextLayout } : query
      })
    }
  })
}
