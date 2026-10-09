import type { H3Event } from 'h3'
import type { AdminRole } from '#admin/shared/models/admin'
import { getApp } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { AUTH_COOKIE_NAME, decodeSessionCookie } from 'vuefire/server'

interface AuthenticatedUser {
  uid: string
  role: AdminRole
}

/** Resolves the caller UID from the session cookie, falling back to a Bearer ID token. */
async function resolveUid(event: H3Event): Promise<string | undefined> {
  const adminApp = getApp()
  let uid: string | undefined

  // 1. Try session cookie — set by nuxt-vuefire after login (standard browser flow).
  try {
    const sessionCookie = getCookie(event, AUTH_COOKIE_NAME)
    const decodedSession = await decodeSessionCookie(sessionCookie, adminApp)
    if (decodedSession?.uid) {
      uid = decodedSession.uid
    }
  } catch {
    // Expired or invalid session cookie — fall through to Bearer token
  }

  // 2. Fallback to Bearer token — Firebase ID token for PWA / external callers.
  if (!uid) {
    const authorization = getHeader(event, 'authorization')
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : null

    if (bearerToken) {
      try {
        const decodedToken = await getAdminAuth(adminApp).verifyIdToken(bearerToken)
        uid = decodedToken?.uid
      } catch {
        // Invalid token — fall through to 401
      }
    }
  }

  return uid
}

/**
 * Verifies the caller is authenticated and holds one of `allowedRoles` in `/admins/{uid}`.
 *
 * @throws 401 if no valid authentication is present
 * @throws 403 if authenticated but the role is not allowed
 */
export async function requireRole(event: H3Event, allowedRoles: AdminRole[]): Promise<AuthenticatedUser> {
  const uid = await resolveUid(event)

  if (!uid) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = getFirestore(getApp())
  const adminDoc = await db.collection('admins').doc(uid).get()
  const data = adminDoc.exists ? adminDoc.data() : null
  const role = data?.role as AdminRole | undefined

  if (!role || !allowedRoles.includes(role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return { uid, role }
}

/** Requires an authenticated admin (role `admin`). */
export function requireAdmin(event: H3Event): Promise<AuthenticatedUser> {
  return requireRole(event, ['admin'])
}

/** Requires authenticated staff (role `admin` or `editor`). */
export function requireStaff(event: H3Event): Promise<AuthenticatedUser> {
  return requireRole(event, ['admin', 'editor'])
}
