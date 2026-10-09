/** Returns the resolved canonical site URL from Nuxt Site Config. */
export function useSiteUrl(): string {
  return useSiteConfig().url
}
