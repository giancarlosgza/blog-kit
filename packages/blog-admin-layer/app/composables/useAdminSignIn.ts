import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'

export type AdminSignInMethod = 'google' | 'email'

/**
 * Sign-in mechanics for the login page: the layer's default one or a site's own
 * `app/pages/auth/login.vue`. Signs in with Firebase Auth (the session cookie and the `auth`
 * middleware take it from there) and returns to the `?redirect=` path afterwards.
 */
export function useAdminSignIn() {
  const auth = useFirebaseAuth()
  const user = useCurrentUser()
  const route = useRoute()

  const error = ref<string>('')
  const loading = ref<AdminSignInMethod | null>(null)
  const isBusy = computed<boolean>(() => loading.value !== null)

  /** Same-site path from `?redirect=`; anything else (absolute or protocol-relative URLs) is ignored. */
  const redirectTo = computed<string | null>(() => {
    const redirect = route.query.redirect
    if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//'))
      return null
    return redirect
  })

  async function run(method: AdminSignInMethod, signIn: () => Promise<unknown>, toMessage: (err: any) => string) {
    if (!auth || isBusy.value)
      return

    loading.value = method
    error.value = ''
    try {
      await signIn()
      await navigateTo(redirectTo.value ?? '/')
    } catch (err: any) {
      error.value = toMessage(err)
    } finally {
      loading.value = null
    }
  }

  function signInWithGoogle() {
    return run('google', () => signInWithPopup(auth!, new GoogleAuthProvider()), err => err?.message || 'Sign-in failed.')
  }

  function signInWithEmail(email: string, password: string) {
    return run('email', () => signInWithEmailAndPassword(auth!, email.trim(), password), (err) => {
      switch (err?.code) {
        case 'auth/operation-not-allowed':
          return 'Email/password sign-in is disabled.'
        case 'auth/too-many-requests':
          return 'Too many attempts, try again later.'
        default:
          return 'Invalid email or password.'
      }
    })
  }

  async function signOutUser() {
    if (!auth)
      return

    error.value = ''
    try {
      await signOut(auth)
    } catch (err: any) {
      error.value = err?.message || 'Sign-out failed.'
    }
  }

  return { user, error, loading, isBusy, redirectTo, signInWithGoogle, signInWithEmail, signOut: signOutUser }
}
