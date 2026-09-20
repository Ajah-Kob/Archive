'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { timeAgo } from '@/lib/helper'
import { revalidateFeature } from '@/lib/actions/revalidate'

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

// CREATE — called when faculty accepts the coordinator invitation
export async function addCoordinator(facultyId: number) {
  try {
    const existing = await prisma[table].findFirst({
      where: { facultyId, deletedAt: null },
    })
    if (existing) {
      return {
        success: false,
        payload: null,
        message: 'This faculty member is already a coordinator.',
      }
    }

    // A previous removal soft-deletes the row, which still occupies the
    // unique facultyId slot. Re-inviting revives the existing record instead
    // of creating a new one.
    const record = await prisma[table].upsert({
      where: { facultyId },
      create: { facultyId },
      update: { deletedAt: null },
      include: {
        faculty: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, avatarGradient: true },
            },
          },
        },
      },
    })

    revalidateTag('coordinators', 'max')
    revalidateTag('faculty', 'max')
    revalidateFeature('sections')

    return {
      success: true,
      message: 'Coordinator created successfully',
      payload: record,
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to create coordinator',
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

