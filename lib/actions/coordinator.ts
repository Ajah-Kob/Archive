'use server'

import prisma from '@/lib/prisma'
import { revalidateTag, updateTag } from 'next/cache'
import { timeAgo } from '@/lib/helper'
import { revalidateFeature } from '@/lib/actions/revalidate'
import { audit } from '@/lib/actions/audit'

// A coordinator is considered "active now" if they signed in within this window.
// Mirrors the faculty activity window in lib/actions/faculty.ts.
const ACTIVE_NOW_MS = 5 * 60 * 1000

function activityStatusFor(loggedInAt: Date | null): 'active' | string {
  if (!loggedInAt) return 'Never'
  if (Date.now() - loggedInAt.getTime() < ACTIVE_NOW_MS) return 'active'
  return timeAgo(loggedInAt)
}
import { USERS_PER_PAGE } from '@/config/constants'
import { requireAdminOrProgramChair, requireUser } from '@/lib/actions/guard'
import {
  requireGlobalSectionManager,
  sectionUnauthorized,
} from '@/lib/actions/sectionAuthorization'

const table = 'coordinator'

// GET ALL (paginated)
async function getCoordinatorsData(page: number, perPage: number) {
  try {
    const skip = (page - 1) * perPage
    const [coordinators, total] = await prisma.$transaction([
      prisma[table].findMany({
        where: { deletedAt: null },
        skip,
        take: perPage,
        orderBy: { id: 'asc' },
        include: {
          faculty: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true, avatarGradient: true },
              },
            },
          },
          _count: { select: { section: true } },
        },
      }),
      prisma[table].count({ where: { deletedAt: null } }),
    ])
    return {
      success: true,
      payload: coordinators,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    }
  } catch {
    return {
      success: false,
      payload: null,
      total: 0,
      totalPages: 1,
      message: 'Failed to get coordinators',
    }
  }
}

export async function getCoordinators(page = 1, perPage = USERS_PER_PAGE) {
  if (!(await requireUser()))
    return {
      success: false,
      payload: null,
      total: 0,
      totalPages: 1,
      message: 'Not authorized',
    }
  return getCoordinatorsData(page, perPage)
}

// Direct manager assignment — no Invitation row and no acceptance step.
export async function assignCoordinatorRole(facultyId: number) {
  const session = await requireAdminOrProgramChair()
  if (!session?.user?.id) {
    return {
      success: false,
      payload: null,
      message: 'You are not authorized to perform this action.',
    }
  }
  if (!Number.isInteger(facultyId) || facultyId < 1) {
    return { success: false, payload: null, message: 'Invalid faculty id.' }
  }

  try {
    const faculty = await prisma.faculty.findFirst({
      where: {
        id: facultyId,
        deletedAt: null,
        user: { deletedAt: null },
      },
      include: {
        coordinator: true,
        user: { select: { id: true, name: true } },
      },
    })
    if (!faculty) {
      return { success: false, payload: null, message: 'Faculty not found.' }
    }
    if (faculty.coordinator && faculty.coordinator.deletedAt === null) {
      return {
        success: false,
        payload: null,
        message: 'This faculty member is already a coordinator.',
      }
    }

    // A previous removal soft-deletes the row, which still occupies the
    // unique facultyId slot. Direct assignment revives that record. The role
    // and its in-app notification commit together or not at all.
    const [record] = await prisma.$transaction([
      prisma.coordinator.upsert({
        where: { facultyId },
        create: { facultyId },
        update: { deletedAt: null },
        include: {
          faculty: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  avatarGradient: true,
                },
              },
            },
          },
        },
      }),
      prisma.notification.create({
        data: {
          userId: faculty.userId,
          title: 'Coordinator role assigned',
          body: 'You have been assigned as a Coordinator and can now access coordinator features.',
          href: '/faculty',
        },
      }),
    ])

    try {
      await audit({
        action: 'COORDINATOR_ASSIGN',
        entity: 'COORDINATOR',
        entityId: String(record.id),
        entityName: faculty.user.name,
        before: { facultyId, active: false },
        after: { facultyId, active: true },
      })
    } catch {}

    updateTag('coordinators')
    updateTag('faculty')
    revalidateFeature('faculties')
    revalidateFeature('sections')

    return {
      success: true,
      message: `${faculty.user.name} assigned as Coordinator.`,
      payload: record,
    }
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      return {
        success: false,
        payload: null,
        message: 'This faculty member is already a coordinator.',
      }
    }
    console.error('[assignCoordinatorRole | Error]:', error)
    return {
      success: false,
      payload: null,
      message: 'Failed to assign coordinator role.',
    }
  }
}

// REMOVE — only allowed if coordinator has no sections
export async function removeCoordinator(id: string) {
  if (!(await requireAdminOrProgramChair())) {
    return {
      success: false,
      payload: null,
      message: 'You are not authorized to perform this action.',
    }
  }

  const targetId = parseInt(id)
  if (Number.isNaN(targetId)) {
    return { success: false, payload: null, message: 'Invalid coordinator id.' }
  }

  try {
    const coordinator = await prisma[table].findFirst({
      where: { id: targetId, deletedAt: null },
      include: { _count: { select: { section: true } } },
    })
    if (!coordinator) {
      return {
        success: false,
        payload: null,
        message: 'Coordinator not found.',
      }
    }

    if (coordinator._count.section > 0) {
      return {
        success: false,
        payload: null,
        message: `Cannot remove coordinator with ${coordinator._count.section} existing section(s). Remove sections first.`,
      }
    }

    const record = await prisma[table].update({
      where: { id: targetId },
      data: { deletedAt: new Date() },
    })

    revalidateTag('coordinators', 'max')
    revalidateTag('faculty', 'max')
    revalidateFeature('sections')

    return {
      success: true,
      payload: record,
      message: 'Coordinator removed successfully.',
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to remove coordinator',
    }
  }
}

// DETAIL — coordinator profile with handled sections and total students.
// Fresh read on every open so section/student counts never go stale.
export async function getCoordinatorDetail(facultyId: number) {
  if (!(await requireAdminOrProgramChair())) {
    return {
      success: false,
      payload: null,
      message: 'You are not authorized to perform this action.',
    }
  }

  try {
    const faculty = await prisma.faculty.findFirst({
      where: { id: facultyId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            avatarGradient: true,
            loggedInAt: true,
          },
        },
        coordinator: {
          include: {
            section: {
              where: { deletedAt: null },
              select: {
                id: true,
                section: true,
                students: {
                  where: { deletedAt: null },
                  select: { id: true },
                },
              },
              orderBy: { section: 'asc' },
            },
          },
        },
      },
    })

    if (!faculty || !faculty.coordinator || faculty.coordinator.deletedAt !== null) {
      return {
        success: false,
        payload: null,
        message: 'Coordinator not found.',
      }
    }

    const sections = faculty.coordinator.section.map((s) => ({
      id: s.id,
      name: s.section,
      studentCount: s.students.length,
    }))

    return {
      success: true,
      payload: {
        id: faculty.id,
        userId: faculty.userId,
        name: faculty.user.name,
        email: faculty.user.email,
        activityStatus: activityStatusFor(faculty.user.loggedInAt),
        totalStudents: sections.reduce((n, s) => n + s.studentCount, 0),
        sections,
      },
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to get coordinator details',
    }
  }
}

export interface ActiveCoordinatorOption {
  id: number
  facultyId: number
  name: string
  email: string
  image: string | null
  avatarGradient: string
  sectionsManaged: number
}

// ────────────────── Live active-coordinator list (manager-only) ──
// Direct-assignment modal source: only Coordinator rows whose full chain is
// live (Coordinator.deletedAt null, Faculty.deletedAt null, User.deletedAt
// null). Guarded DB-backed via requireGlobalSectionManager (live
// SUPERADMIN/ADMIN or live isProgramChair); proxy is never the only guard.
// Fresh read on every open so the modal never shows a stale roster — no
// 'use cache' here (mirrors getCoordinatorDetail). Empty roster returns an
// empty payload (the modal renders "No active coordinators available").
// Never creates an Invitation or Notification; standard response shape.
export async function getActiveCoordinators() {
  // Global-manager-only: DB-backed via sectionAuthorization.
  const session = await requireGlobalSectionManager()
  if (!session?.user?.id) {
    return sectionUnauthorized
  }

  try {
    const rows = await prisma[table].findMany({
      where: {
        deletedAt: null,
        faculty: {
          deletedAt: null,
          user: { deletedAt: null },
        },
      },
      include: {
        faculty: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
                avatarGradient: true,
              },
            },
          },
        },
        _count: {
          select: { section: { where: { deletedAt: null } } },
        },
      },
      orderBy: { faculty: { user: { name: 'asc' } } },
    })

    const payload: ActiveCoordinatorOption[] = rows.map((row) => ({
      id: row.id,
      facultyId: row.facultyId,
      name: row.faculty.user.name,
      email: row.faculty.user.email,
      image: row.faculty.user.image,
      avatarGradient: row.faculty.user.avatarGradient,
      sectionsManaged: row._count.section,
    }))

    return { success: true, payload }
  } catch (error) {
    console.error('[getActiveCoordinators | Error]:', error)
    return {
      success: false,
      payload: null,
      message: 'Failed to fetch coordinators.',
    }
  }
}

