/**
 * Blog identity: the static `app.config.ts` brand plus the admin-editable name and
 * description from `settings/general`, which win when set.
 */
export function useBlogBrand() {
  const brand = useAppConfig().blog
  const { settings } = useBlogSettings()

  const blogName = computed(() => settings.value?.blogName?.trim() || brand.shortName)
  const blogDescription = computed(() => settings.value?.blogDescription?.trim() || brand.description)

  return { brand, blogName, blogDescription }
}
