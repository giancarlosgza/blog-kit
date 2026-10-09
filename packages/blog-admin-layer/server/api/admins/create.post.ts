import type { AdminRole } from '#admin/shared/models/admin'
import { getApp } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { ADMIN_ROLES } from '#admin/shared/models/admin'

/**
 * POST /api/admins/create
 *
 * Creates a new Firebase Auth account and its matching `admins/{uid}` document
 * in a single server-side operation.
 *
 * Using the Admin SDK here (instead of `createUserWithEmailAndPassword` on the
 * client) is intentional: the client-side method would immediately sign in as
 * the newly created user, destroying the current admin session.
 *
 * @requires Authorization — Bearer ID token (or session cookie) of an `admin`.
 * @body {{ displayName: string, email: string, password: string, role: AdminRole }}
 * @returns {{ uid: string }} UID of the newly created admin.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{
    displayName: string
    email: string
    password: string
    role: AdminRole
  }>(event)

  const displayName = body.displayName?.trim()
  const email = body.email?.trim()
  const { password, role } = body

  if (!displayName || !email || !role) {
    throw createError({ statusCode: 400, statusMessage: 'Name, email and role are required' })
  }
  if (!password || password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters' })
  }
  if (!ADMIN_ROLES.includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
  }

  const adminApp = getApp()

  let authUser
  try {
    authUser = await getAdminAuth(adminApp).createUser({
      displayName,
      email,
      password,
      emailVerified: true
    })
  } catch (error: any) {
    if (error?.code === 'auth/email-already-exists') {
      throw createError({ statusCode: 409, statusMessage: 'A user with this email already exists' })
    }
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Failed to create user' })
  }

  await getFirestore(adminApp).collection('admins').doc(authUser.uid).set({
    name: displayName,
    displayName,
    email,
    role,
    isAdmin: role === 'admin',
    createdAt: FieldValue.serverTimestamp()
  })

  return { uid: authUser.uid }
})
