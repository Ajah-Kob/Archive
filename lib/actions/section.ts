'use server'

import prisma from '@/lib/prisma'
import { revalidateTag, revalidatePath } from 'next/cache'
import { cacheLife, cacheTag } from 'next/cache'
import { USERS_PER_PAGE } from '@/config/constants'
import { requireUser, requireAdmin } from '@/lib/actions/guard'

const table = 'section'

// GET ONE
async function getSectionData(id: string) {
  'use cache'
  cacheTag('sections')
  cacheLife('max')

  try {
    const section = await prisma[table].findFirst({
      where: { id: +id, deletedAt: null },
      include: {
        coordinator: { include: { faculty: { include: { user: true } } } },
        students: true,
      },
    })
    return { success: true, payload: section }
  } catch {
    return { success: false, payload: null, message: 'Failed to get section' }
  }
}

export async function getSection(id: string) {
  if (!(await requireUser()))
    return { success: false, payload: null, message: 'Not authorized' }
  return getSectionData(id)
}

// GET ALL (paginated)
async function getSectionsData(page: number, perPage: number) {
  'use cache'
  cacheTag('sections')
  cacheLife('max')

  try {
    const skip = (page - 1) * perPage
    const [sections, total] = await prisma.$transaction([
      prisma[table].findMany({
        where: { deletedAt: null },
        skip,
        take: perPage,
        orderBy: { id: 'asc' },
        include: {
          coordinator: { include: { faculty: { include: { user: true } } } },
          students: true,
        },
      }),
      prisma[table].count({ where: { deletedAt: null } }),
    ])
    return {
      success: true,
      payload: sections,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    }
  } catch {
    return {
      success: false,
      payload: null,
      total: 0,
      totalPages: 1,
      message: 'Failed to get sections',
    }
  }
}

export async function getSections(
  page: number = 1,
  perPage: number = USERS_PER_PAGE,
) {
  if (!(await requireUser()))
    return {
      success: false,
      payload: null,
      total: 0,
      totalPages: 1,
      message: 'Not authorized',
    }
  return getSectionsData(page, perPage)
}


// SOFT DELETE (admin only)
export async function softDeleteSection(id: string) {
  if (!(await requireAdmin())) {
    return {
      success: false,
      payload: null,
      message: 'You are not authorized to perform this action.',
    }
  }

  const targetId = parseInt(id)
  if (Number.isNaN(targetId)) {
    return { success: false, payload: null, message: 'Invalid section id.' }
  }

  try {
    const target = await prisma[table].findFirst({
      where: { id: targetId, deletedAt: null },
    })
    if (!target) {
      return { success: false, payload: null, message: 'Section not found.' }
    }

    const record = await prisma[table].update({
      where: { id: targetId },
      data: { deletedAt: new Date() },
    })

    revalidateTag('sections', 'max')
    revalidatePath('/dashboard/sections')

    return {
      success: true,
      payload: record,
      message: 'Section deleted successfully.',
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to delete section',
    }
  }
}

// UPDATE (admin only)
export async function updateSection(_prevState: any, formData: FormData) {
  const session = await requireAdmin()
  if (!session) {
    return {
      success: false,
      message: 'You are not authorized to perform this action.',
    }
  }

  const id = formData.get('id')?.toString().trim()
  const sectionId = formData.get('sectionId')?.toString().trim()
  const joinCode = formData.get('joinCode')?.toString().trim()
  const coordinatorId = formData.get('coordinatorId')?.toString().trim()
  const section = formData.get('section')?.toString().trim()
  const yearLevel = formData.get('yearLevel')?.toString().trim()

  const errors: Record<string, string> = {}
  if (!sectionId) errors.sectionId = 'Section ID is required.'
  if (!joinCode) errors.joinCode = 'Join code is required.'
  if (!coordinatorId) errors.coordinatorId = 'Coordinator is required.'
  if (!section) errors.section = 'Section name is required.'
  if (!yearLevel) errors.yearLevel = 'Year level is required.'

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
      input: { id, sectionId, joinCode, coordinatorId, section, yearLevel },
    }
  }

  const targetId = parseInt(id!)
  if (Number.isNaN(targetId)) {
    return {
      success: false,
      message: 'Invalid section id.',
      input: { id, sectionId, joinCode, coordinatorId, section, yearLevel },
    }
  }

  const parsedCoordinatorId = parseInt(coordinatorId!)
  if (Number.isNaN(parsedCoordinatorId)) {
    return {
      success: false,
      message: 'Invalid coordinator.',
      input: { id, sectionId, joinCode, coordinatorId, section, yearLevel },
    }
  }

  try {
    const target = await prisma[table].findFirst({
      where: { id: targetId, deletedAt: null },
    })
    if (!target) {
      return {
        success: false,
        message: 'Section not found.',
        input: { id, sectionId, joinCode, coordinatorId, section, yearLevel },
      }
    }

    const existing = await prisma[table].findFirst({
      where: { joinCode, NOT: { id: targetId } },
    })
    if (existing) {
      return {
        success: false,
        message: `Join code "${joinCode}" is already in use.`,
        input: { id, sectionId, joinCode, coordinatorId, section, yearLevel },
      }
    }

    const record = await prisma[table].update({
      where: { id: targetId },
      data: {
        sectionId: sectionId!,
        joinCode: joinCode!,
        coordinatorId: parsedCoordinatorId,
        section: section!,
        yearLevel: yearLevel!,
        updatedAt: new Date(),
      },
    })

    revalidateTag('sections', 'max')
    revalidatePath('/dashboard/sections')

    return {
      success: true,
      message: 'Section updated successfully.',
      payload: record,
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to update section.',
    }
  }
}
