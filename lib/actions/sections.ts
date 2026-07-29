'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidatePath, revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import type { SectionData } from '@/components/coordinator/main/SectionDataRow'
import { getInitials } from '@/lib/helper'

const gradients = [
  'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
  'linear-gradient(135deg, #fe6f6f 0%, #e85555 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #e08800 100%)',
  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)',
]

const table = 'section'

function getGradient(id: number) {
  return gradients[id % gradients.length]
}

async function getSectionsData() {
  'use cache'
  cacheTag('sections')
  cacheLife('max')

  const sections = await prisma[table].findMany({
    where: { deletedAt: null },
    include: {
      coordinator: {
        include: {
          faculty: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
      students: {
        where: { deletedAt: null },
        select: { id: true, groupId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const payload: SectionData[] = sections.map((s) => ({
    id: s.id,
    coordinator: {
      initials: getInitials(s.coordinator.faculty.user.name),
      name: s.coordinator.faculty.user.name,
      email: s.coordinator.faculty.user.email,
      avatarGradient: getGradient(s.id),
    },
    section: s.section,
    dateCreated: s.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    students: s.students.length,
    groups: new Set(
      s.students.filter((st) => st.groupId).map((st) => st.groupId),
    ).size,
  }))

  return payload
}

export async function getSections() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
  }

  try {
    const payload = await getSectionsData()
    return { success: true, payload }
  } catch (error) {
    console.error('[getSections | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch sections',
      payload: null,
    }
  }
}

export async function joinSection(formData: FormData) {
  const code = formData.get('code')?.toString().trim()
  if (!code) {
    return { success: false, message: 'Please enter an invitation code.' }
  }

  try {
    const joinCode = await prisma.joinCode.findFirst({
      where: {
        code,
        type: 'STUDENT',
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { section: true },
    })

    if (!joinCode) {
      return { success: false, message: 'Invalid or expired invitation code.' }
    }

    if (!joinCode.section) {
      return { success: false, message: 'No section is linked to this code.' }
    }

    const existingStudent = await prisma.student.findFirst({
      where: { userId: +session.user.id, deletedAt: null },
    })

    if (existingStudent) {
      return {
        success: false,
        message: 'You are already enrolled in a section.',
      }
    }

    await prisma.student.create({
      data: {
        userId: +session.user.id,
        sectionId: joinCode.section.id,
      },
    })

    return { success: true, message: 'Successfully joined the section.' }
  } catch (error) {
    console.error('joinSection error:', error)
    return {
      success: false,
      message: 'Something went wrong. Please try again.',
    }
  }
}

// SOFT DELETE (admin only)
export async function softDeleteSection(id: string) {

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
    revalidatePath('/sections')

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
