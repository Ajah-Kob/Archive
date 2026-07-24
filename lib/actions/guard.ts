import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN']

// Result returned to the client when a guard denies access. Server actions
// return this shape instead of throwing so the calling form can render it.
export const unauthorized = {
  success: false as const,
  payload: null,
  message: 'You are not authorized to perform this action.',
}

// Returns the current session, or null if the caller is not signed in.
export async function getSession(): Promise<Session | null> {
  return (await getServerSession(authOptions)) as Session | null
}

// Guards a server action for any signed-in user. Returns the session, or an
// `unauthorized` result the caller should return as-is when null.
export async function requireUser(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  return session
}

// Guards a server action for admins (SUPERADMIN/ADMIN).
export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession()
  if (!session?.user?.id) return null
  if (!ADMIN_ROLES.includes((session.user.role as string) ?? '')) return null
  return session
}

// Guards a server action for users with a coordinator record.
export async function requireCoordinator(): Promise<Session | null> {
  const session = await requireUser()
  if (!session) return null
  const coordinatorTable = 'coordinator' as const
  const coordinator = await prisma[coordinatorTable].findFirst({
    where: {
      faculty: { userId: +session.user.id, deletedAt: null },
      deletedAt: null,
    },
  })
  console.log(coordinator)
  return coordinator ? session : null
}

// Guards a server action for users with an adviser record.
export async function requireAdviser(): Promise<Session | null> {
  const session = await requireUser()
  if (!session) return null
  const adviserTable = 'adviser' as const
  const adviser = await prisma[adviserTable].findFirst({
    where: {
      faculty: { userId: +session.user.id, deletedAt: null },
      deletedAt: null,
    },
  })
  console.log(adviser)
  return adviser ? session : null
}

// Guards a server action for users with a student record.
export async function requireStudent(): Promise<Session | null> {
  const session = await requireUser()
  if (!session) return null
  const studentTable = 'student' as const
  const student = await prisma[studentTable].findFirst({
    where: { userId: +session.user.id, deletedAt: null },
  })
  return student ? session : null
}

// Guards a server action for users with a panelist record.
// Note: Panelist model does not exist in the schema yet — always returns null.
export async function requirePanelist(): Promise<Session | null> {
  const session = await requireUser()
  if (!session) return null
  return null
}

// Strips the password hash (and any other secrets) before a user row is sent
// to the client. Accepts a single row or an array.
export function sanitizeUser<T extends { password?: unknown } | null>(
  user: T,
): T {
  if (!user) return user
  const { password, ...safe } = user as Record<string, unknown>
  return safe as T
}

export function sanitizeUsers<T extends { password?: unknown }>(
  users: T[] | null | undefined,
): T[] {
  if (!users) return []
  return users.map((u) => sanitizeUser(u))
}
