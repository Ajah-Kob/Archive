import type { Session } from 'next-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { unauthorized } from '@/lib/actions/guard'

// =============================================================================
// Section authorization policy (DB-backed, action-level).
//
// proxy.ts gates route entry from JWT flags, but JWTs go stale for ~60s after
// a role change. Every section read/mutation must therefore re-authenticate
// inside the server action through the helpers below, which read live rows
// (User/Faculty/Coordinator/Section with deletedAt: null) on every call.
// Deleting or revoking any link in the chain revokes access immediately.
//
// Decision matrix (allow = helper returns non-null; deny = null, caller
// returns `unauthorized`):
//
// | Actor                                        | requireGlobalSectionManager | requireAssignedSectionCoordinator(id) | authorizeSectionAccess(id) |
// |----------------------------------------------|-----------------------------|---------------------------------------|----------------------------|
// | SUPERADMIN/ADMIN (live User, not deleted)    | allow                       | deny (unless also the assignee)       | global-manager (any live section, incl. unassigned) |
// | Program Chair (live Faculty isProgramChair)  | allow                       | deny (unless also the assignee)       | global-manager (any live section, incl. unassigned) |
// | Assigned coordinator (owns section id)       | deny                        | allow (own live section only)         | assigned-coordinator       |
// | Unrelated coordinator (owns another section) | deny                        | deny (coordinatorId mismatch)         | deny                       |
// | Coordinator with no sections, or section     | deny                        | deny (coordinatorId null → explicit   | deny                       |
// |   unassigned (coordinatorId null)            |                             |   deny; never matches a coordinator)  |                            |
// | Student / Guest / Adviser-only / ordinary    | deny                        | deny (no live coordinator row, or     | deny                       |
// |   faculty (no chair, no coordinator row)     |                             |   role is not admin/chair)            |                            |
// | Any caller with deleted User/Faculty/        | deny                        | deny                                  | deny                       |
// |   Coordinator/Section row, or archived       |                             |                                       |                            |
// |   section (deletedAt set)                    |                             |                                       |                            |
//
// Scope notes:
// - Global managers own global mutations (create, edit name + academic year,
//   archive, assign/reassign coordinator). Assigned coordinators own only their
//   section's name + header color; academic year is read-only for them.
// - Students, guests, advisers, and ordinary faculty are denied all section
//   mutations by construction: they satisfy neither the global nor the
//   assigned branch.
// =============================================================================

// Standard denial shape for section actions. Re-exports the shared guard
// shape so callers return an identical `{ success, message, payload }`.
export const sectionUnauthorized = unauthorized

export type SectionActorKind = 'global-manager' | 'assigned-coordinator'

interface LiveSession {
  session: Session
  userId: number
}

// Authenticates inside the server action and resolves the caller's numeric
// user id. Returns null when unsigned in or when the id is not an integer.
// Every policy helper starts here so proxy.ts is never the only boundary.
async function liveSession(): Promise<LiveSession | null> {
  const session = (await getServerSession(authOptions)) as Session | null
  if (!session?.user?.id) return null
  const userId = Number(session.user.id)
  if (!Number.isInteger(userId)) return null
  return { session, userId }
}

// Live role from the User row. Deleted users have no role — they are denied.
async function liveUserRole(userId: number): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { role: true },
  })
  if (!user) return null
  return user.role as string
}

// Live program-chair flag from the Faculty row joined to a live User.
// Relation includes do not respect soft-deletes, so deletedAt is checked
// explicitly on both sides.
async function isLiveProgramChair(userId: number): Promise<boolean> {
  const faculty = await prisma.faculty.findFirst({
    where: {
      userId,
      deletedAt: null,
      isProgramChair: true,
      user: { deletedAt: null },
    },
    select: { id: true },
  })
  return faculty !== null
}

// Live coordinator id for the caller, or null. The full chain
// (Coordinator → Faculty → User) must be live; a removed coordinator,
// faculty, or user loses access without waiting for a JWT refresh.
async function liveCoordinatorId(userId: number): Promise<number | null> {
  const coordinator = await prisma.coordinator.findFirst({
    where: {
      deletedAt: null,
      faculty: {
        deletedAt: null,
        userId,
        user: { deletedAt: null },
      },
    },
    select: { id: true },
  })
  if (!coordinator) return null
  return coordinator.id
}

// Guards global section management (create, global edit, archive,
// assign/reassign coordinator, global reads). Authorized only for a live
// SUPERADMIN/ADMIN User or a live Faculty row with isProgramChair=true.
// DB-backed on every call; stale JWT roles are never trusted.
export async function requireGlobalSectionManager(): Promise<Session | null> {
  const live = await liveSession()
  if (!live) return null

  const role = await liveUserRole(live.userId)
  if (!role) return null
  if (role === 'SUPERADMIN' || role === 'ADMIN') return live.session

  const chair = await isLiveProgramChair(live.userId)
  if (!chair) return null
  return live.session
}

export interface AssignedSectionContext {
  session: Session
  coordinatorId: number
  sectionId: number
}

// Guards coordinator-scoped access to one section. Authorized only when all
// of these hold on live rows: the caller owns a live Coordinator record,
// the section is live (deletedAt null), the section is assigned
// (coordinatorId not null), and the section's coordinatorId equals the
// caller's coordinator id. Unassigned sections and unrelated coordinators
// are explicitly denied; students, guests, advisers, and ordinary faculty
// have no coordinator row and are denied by construction.
export async function requireAssignedSectionCoordinator(
  sectionId: number,
): Promise<AssignedSectionContext | null> {
  if (!Number.isInteger(sectionId)) return null

  const live = await liveSession()
  if (!live) return null

  const coordinatorId = await liveCoordinatorId(live.userId)
  if (coordinatorId === null) return null

  const section = await prisma.section.findFirst({
    where: { id: sectionId, deletedAt: null },
    select: { id: true, coordinatorId: true },
  })
  if (!section) return null
  if (section.coordinatorId === null) return null
  if (section.coordinatorId !== coordinatorId) return null

  return { session: live.session, coordinatorId, sectionId: section.id }
}

export type SectionAccess =
  | { kind: 'global-manager'; session: Session; sectionId: number }
  | {
      kind: 'assigned-coordinator'
      session: Session
      coordinatorId: number
      sectionId: number
    }

// Distinguishes the two authorized section actors for a single section in
// one call. Global managers pass for any live section including unassigned
// ones; assigned coordinators pass only for their own live assigned section.
// Everyone else (unrelated coordinators, students, guests, advisers,
// ordinary faculty, deleted/archived chains) receives null and the caller
// returns `sectionUnauthorized`. Authenticates inside the action.
export async function authorizeSectionAccess(
  sectionId: number,
): Promise<SectionAccess | null> {
  if (!Number.isInteger(sectionId)) return null

  const live = await liveSession()
  if (!live) return null

  const section = await prisma.section.findFirst({
    where: { id: sectionId, deletedAt: null },
    select: { id: true, coordinatorId: true },
  })
  if (!section) return null

  const role = await liveUserRole(live.userId)
  if (!role) return null
  if (role === 'SUPERADMIN' || role === 'ADMIN') {
    return { kind: 'global-manager', session: live.session, sectionId: section.id }
  }

  const chair = await isLiveProgramChair(live.userId)
  if (chair) {
    return { kind: 'global-manager', session: live.session, sectionId: section.id }
  }

  const coordinatorId = await liveCoordinatorId(live.userId)
  if (coordinatorId === null) return null
  if (section.coordinatorId === null) return null
  if (section.coordinatorId !== coordinatorId) return null

  return {
    kind: 'assigned-coordinator',
    session: live.session,
    coordinatorId,
    sectionId: section.id,
  }
}
