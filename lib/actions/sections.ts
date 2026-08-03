'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidatePath, revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import type { SectionData } from '@/components/sections/main/SectionDataRow'
import type { StudentData } from '@/components/sections/students/StudentDataRow'
import { getInitials, timeAgo } from '@/lib/helper'
import { unslugify } from '@/lib/slug'

const gradients = [
  'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
  'linear-gradient(135deg, #fe6f6f 0%, #e85555 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #e08800 100%)',
  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)',
]

const table = 'section'

// A student is considered "active now" if they signed in within this window.
const ACTIVE_NOW_MS = 5 * 60 * 1000

function activityStatusFor(loggedInAt: Date | null): 'active' | string {
  if (!loggedInAt) return 'Never'
  if (Date.now() - loggedInAt.getTime() < ACTIVE_NOW_MS) return 'active'
  return timeAgo(loggedInAt)
}

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

export interface SectionDetailData {
  section: {
    id: number
    name: string
    coordinatorName: string
    studentsCount: number
    groupsCount: number
  }
  students: StudentData[]
}

async function getSectionDetailData(slug: string) {
  'use cache'
  cacheTag(`section-${slug}`)
  cacheLife('max')

  const section = await prisma[table].findFirst({
    where: {
      deletedAt: null,
      section: { equals: unslugify(slug), mode: 'insensitive' },
    },
    include: {
      coordinator: {
        include: {
          faculty: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      },
      students: {
        where: { deletedAt: null },
        orderBy: { user: { name: 'asc' } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              loggedInAt: true,
            },
          },
          group: {
            select: {
              id: true,
              groupName: true,
              students: {
                where: { deletedAt: null },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  })

  if (!section) return null

  const students: StudentData[] = section.students.map((s) => ({
    id: s.id,
    userId: s.user.id,
    initials: getInitials(s.user.name),
    name: s.user.name,
    email: s.user.email,
    avatarGradient: getGradient(s.id),
    activityStatus: activityStatusFor(s.user.loggedInAt),
    loggedInAt: s.user.loggedInAt,
    group: s.group
      ? {
          name: s.group.groupName,
          members: s.group.students.length,
        }
      : null,
  }))

  return {
    section: {
      id: section.id,
      name: section.section,
      coordinatorName: section.coordinator.faculty.user.name,
      studentsCount: students.length,
      groupsCount: new Set(
        students.filter((s) => s.group).map((s) => s.group!.name),
      ).size,
    },
    students,
  }
}

export async function getSectionBySlug(slug: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
  }

  try {
    const payload = await getSectionDetailData(slug)
    if (!payload) {
      return { success: false, message: 'Section not found', payload: null }
    }
    return { success: true, payload }
  } catch (error) {
    console.error('[getSectionBySlug | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch section',
      payload: null,
    }
  }
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
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated' }
  }

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

    await prisma.user.update({
      where: { id: +session.user.id },
      data: { role: 'STUDENT' },
    })

    revalidateTag('users', 'max')
    revalidateTag('sections', 'max')
    revalidatePath('/sections')

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
