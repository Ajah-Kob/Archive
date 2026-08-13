'use server'

import prisma from '@/lib/prisma'
import { revalidateTag, revalidatePath } from 'next/cache'
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
                select: { id: true, name: true, email: true, image: true },
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
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    })

    revalidateTag('coordinators', 'max')
    revalidateTag('faculty', 'max')
    revalidatePath('/sections')

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
    revalidatePath('/sections')

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
