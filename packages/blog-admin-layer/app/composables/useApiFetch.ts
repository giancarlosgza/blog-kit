import { useFirebaseAuth } from 'vuefire'

/**
 * Returns a $fetch instance that automatically attaches a Firebase Bearer token.
 * Used by composables that call protected server API routes when session cookies
 * are unavailable (e.g. SPA mode with Firebase Auth Emulator in dev).
 */
export function useApiFetch() {
  const auth = useFirebaseAuth()

  return $fetch.create({
    async onRequest({ options }) {
      const user = auth?.currentUser
      if (user) {
        const token = await user.getIdToken()
        const headers = new Headers(options.headers as HeadersInit)
        headers.set('Authorization', `Bearer ${token}`)
        options.headers = headers
      }
    }
  })
}
