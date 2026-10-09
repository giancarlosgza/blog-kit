/** Returns the app version exposed through the public runtime config. */
export function useAppVersion() {
  return useRuntimeConfig().public.appVersion
}
