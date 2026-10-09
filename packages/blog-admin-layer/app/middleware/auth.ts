import type { AdminRole } from '#admin/shared/models/admin'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { ADMIN_ROLES } from '#admin/shared/models/admin'

/**
 * Middleware to protect routes: requires an authenticated staff user.
 * - Redirects unauthenticated users to /auth/login?redirect=<fullPath>
 * - Users without a valid role are redirected to /errors/403
 * - Users whose role is not allowed by the page's `roles` meta are redirected to /
 * Notes:
 * - Reads the role from `admins/{uid}.role` and caches it in the `adminRole` state
 *   (keyed by `adminRoleUid`) so navigation does not refetch it; app.vue clears it on sign-out
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/auth/login') || to.path.startsWith('/errors/403')) {
    return
  }

  let user: any = null

  try {
    user = await getCurrentUser()
  } catch (error) {
    console.log('Auth middleware: failed to get current user:', error)
  }

  // Not authenticated → go to login preserving destination
  if (!user) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }

  const roleState = useState<AdminRole | null>('adminRole', () => null)
  const roleUidState = useState<string | null>('adminRoleUid', () => null)

  // Only hit Firestore when there is no cached role for this user
  if (!roleState.value || roleUidState.value !== user.uid) {
    let role: AdminRole | null = null

    try {
      const db = getFirestore(useNuxtApp().$firebaseApp)
      const adminDoc = await getDoc(doc(db, 'admins', user.uid))
      const candidate = adminDoc.exists() ? adminDoc.data()?.role as AdminRole | undefined : undefined

      if (candidate && ADMIN_ROLES.includes(candidate)) {
        role = candidate
      }
    } catch (error) {
      console.log('Auth middleware: failed to verify admin role:', error)
    }

    roleState.value = role
    roleUidState.value = role ? user.uid : null
  }

  // Authenticated but without a staff role → 403
  if (!roleState.value) {
    return navigateTo({
      path: '/errors/403',
      query: { from: to.fullPath }
    })
  }

  // Role not allowed by the page → dashboard
  const allowedRoles = to.meta.roles as AdminRole[] | undefined

  if (allowedRoles && !allowedRoles.includes(roleState.value)) {
    return navigateTo({ path: '/' }, { replace: true })
  }
})
