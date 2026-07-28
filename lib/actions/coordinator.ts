'use server'

import prisma from '@/lib/prisma'
import { revalidateTag, revalidatePath } from 'next/cache'
import { cacheLife, cacheTag } from 'next/cache'
import { USERS_PER_PAGE } from '@/config/constants'
import { requireAdmin, requireUser } from '@/lib/actions/guard'

const table = 'coordinator'

// GET ALL (paginated)
async function getCoordinatorsData(page: number, perPage: number) {
  'use cache'
  cacheTag('coordinators')
  cacheLife('max')

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
          _count: { select: { sections: true } },
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
  if (!(await requireAdmin())) {
    return {
      success: false,
      payload: null,
      message: 'You are not authorized to perform this action.',
    }
  }

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

    const record = await prisma[table].create({
      data: { facultyId },
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
    revalidatePath('/coordinators')

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
  if (!(await requireAdmin())) {
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
      include: { _count: { select: { sections: true } } },
    })
    if (!coordinator) {
      return {
        success: false,
        payload: null,
        message: 'Coordinator not found.',
      }
    }

    if (coordinator._count.sections > 0) {
      return {
        success: false,
        payload: null,
        message: `Cannot remove coordinator with ${coordinator._count.sections} existing section(s). Remove sections first.`,
      }
    }

    const record = await prisma[table].update({
      where: { id: targetId },
      data: { deletedAt: new Date() },
    })

    revalidateTag('coordinators')
    revalidatePath('/dashboard/coordinators')

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
