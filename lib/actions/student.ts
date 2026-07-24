'use server'

import prisma from '@/lib/prisma'
import { revalidateTag, revalidatePath } from 'next/cache'
import { cacheLife, cacheTag } from 'next/cache'
import { USERS_PER_PAGE } from '@/config/constants'
import { requireAdmin, requireStudent } from '@/lib/actions/guard'

const table = 'student'

// GET ALL (paginated)
async function getStudentsData(page: number, perPage: number) {
  'use cache'
  cacheTag('students')
  cacheLife('max')

  try {
    const skip = (page - 1) * perPage
    const where = { deletedAt: null }
    const [students, total] = await prisma.$transaction([
      prisma[table].findMany({
        where,
        skip,
        take: perPage,
        orderBy: { id: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          section: { select: { id: true, section: true, yearLevel: true } },
          group: { select: { id: true, groupName: true } },
        },
      }),
      prisma[table].count({ where }),
    ])
    return {
      success: true,
      payload: students,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    }
  } catch {
    return {
      success: false,
      payload: null,
      total: 0,
      totalPages: 1,
      message: 'Failed to get students',
    }
  }
}

export async function getStudents(page = 1, perPage = USERS_PER_PAGE) {
  return getStudentsData(page, perPage)
}

// JOIN SECTION — user enters invitation code and adds a student record and links the section
export async function joinStudentRole(userId: number, code: string) {
  if (!(await requireStudent())) {
    return {
      success: false,
      payload: null,
      message: 'Only students can join a section.',
    }
  }

  try {
    const invitation = await prisma[table].findFirst({
      where: { code, deletedAt: null, expiresAt: { gte: new Date() } },
      include: { section: true },
    })

    if (!invitation) {
      return {
        success: false,
        payload: null,
        message: 'Invalid or expired invitation code.',
      }
    }

    if (!invitation.section) {
      return {
        success: false,
        payload: null,
        message: 'This invitation code is not linked to any section.',
      }
    }

    const existing = await prisma[table].findFirst({
      where: { userId, deletedAt: null },
    })
    if (existing) {
      return {
        success: false,
        payload: null,
        message: 'You are already enrolled in a section.',
      }
    }

    const record = await prisma[table].create({
      data: {
        userId,
        sectionId: invitation.section.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        section: { select: { id: true, section: true, yearLevel: true } },
      },
    })

    revalidateTag('students', 'max')
    revalidateTag('sections', 'max')
    revalidatePath('/dashboard/students')

    return {
      success: true,
      message: 'Successfully joined section.',
      payload: record,
    }
  } catch {
    return { success: false, payload: null, message: 'Failed to join section.' }
  }
}

// UPDATE STUDENT GROUP
export async function updateStudentGroup(_prevState: any, formData: FormData) {
  if (!(await requireAdmin())) {
    return {
      success: false,
      message: 'You are not authorized to perform this action.',
    }
  }

  const id = formData.get('id')?.toString().trim()
  const groupId = formData.get('groupId')?.toString().trim()

  const errors: Record<string, string> = {}
  if (!id) errors.id = 'Student ID is required.'
  if (!groupId) errors.groupId = 'Group ID is required.'

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, input: { id, groupId } }
  }

  const targetId = parseInt(id!)
  const parsedGroupId = parseInt(groupId!)
  if (Number.isNaN(targetId))
    return { success: false, message: 'Invalid student id.' }
  if (Number.isNaN(parsedGroupId))
    return { success: false, message: 'Invalid group id.' }

  try {
    const student = await prisma[table].findFirst({
      where: { id: targetId, deletedAt: null },
    })
    if (!student)
      return {
        success: false,
        message: 'Student not found.',
        input: { id, groupId },
      }

    const group = await prisma[table].findFirst({
      where: { id: parsedGroupId, deletedAt: null },
    })
    if (!group)
      return {
        success: false,
        message: 'Group not found.',
        input: { id, groupId },
      }

    const record = await prisma[table].update({
      where: { id: targetId },
      data: { groupId: parsedGroupId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, groupName: true } },
      },
    })

    revalidateTag('students')
    revalidateTag('groups')
    revalidatePath('/dashboard/students')

    return {
      success: true,
      message: 'Student group updated successfully.',
      payload: record,
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to update student group.',
    }
  }
}

// SOFT DELETE
export async function softDeleteStudent(id: string) {
  if (!(await requireAdmin())) {
    return {
      success: false,
      payload: null,
      message: 'You are not authorized to perform this action.',
    }
  }

  const targetId = parseInt(id)
  if (Number.isNaN(targetId))
    return { success: false, payload: null, message: 'Invalid student id.' }

  try {
    const target = await prisma[table].findFirst({
      where: { id: targetId, deletedAt: null },
    })
    if (!target)
      return { success: false, payload: null, message: 'Student not found.' }

    const record = await prisma[table].update({
      where: { id: targetId },
      data: { deletedAt: new Date() },
    })

    revalidateTag('students')
    revalidatePath('/dashboard/students')

    return {
      success: true,
      payload: record,
      message: 'Student deleted successfully.',
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to delete student.',
    }
  }
}
