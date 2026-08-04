'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidatePath, revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import type { SectionData } from '@/components/sections/main/SectionDataRow'
import type { StudentData } from '@/components/sections/students/StudentDataRow'
import { generateJoinCode, getInitials, timeAgo } from '@/lib/helper'
import { unslugify } from '@/lib/slug'
import { requireCoordinator } from '@/lib/actions/guard'

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
    revalidateTag('my-sections', 'max')
    revalidatePath('/sections')
    revalidatePath('/my-sections')

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

// ───────────────────────────── Coordinator: My Sections ─────────────────────────────

export interface MySectionCardData {
  id: number
  name: string
  yearLevel: string
  accent: 'indigo' | 'amber'
  students: number
  groups: number
  hasJoinCode: boolean
  joinCode: string | null
  joinCodeExpiresAt: string | null
  dateCreated: string
}

const JOIN_CODE_TTL_MS = 3 * 24 * 60 * 60 * 1000

function accentForYear(yearLevel: string): 'indigo' | 'amber' {
  return yearLevel === '4th Year' ? 'indigo' : 'amber'
}

function revalidateCoordinatorCache(sectionId?: number) {
  revalidateTag('my-sections', 'max')
  revalidateTag('sections', 'max')
  revalidateTag('join-code', 'max')
  revalidatePath('/my-sections')
  revalidatePath('/sections')
  if (sectionId) revalidateTag(`my-section-${sectionId}`, 'max')
}

async function getCoordinatorSectionsData(coordinatorId: number) {
  'use cache'
  cacheTag('my-sections')
  cacheLife('max')

  const sections = await prisma.section.findMany({
    where: { coordinatorId, deletedAt: null },
    include: {
      students: { where: { deletedAt: null }, select: { id: true } },
      _count: { select: { groups: true } },
      joinCode: true,
    },
    orderBy: { section: 'asc' },
  })

  return sections.map(
    (s): MySectionCardData => {
      const validCode =
        s.joinCode && !s.joinCode.deletedAt ? s.joinCode : null
      return {
        id: s.id,
        name: s.section,
        yearLevel: s.yearLevel,
        accent: accentForYear(s.yearLevel),
        students: s.students.length,
        groups: s._count.groups,
        hasJoinCode: !!validCode,
        joinCode: validCode?.code ?? null,
        joinCodeExpiresAt: validCode?.expiresAt.toISOString() ?? null,
        dateCreated: s.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      }
    },
  )
}

async function getCoordinatorSectionData(sectionId: number) {
  'use cache'
  cacheTag(`my-section-${sectionId}`)
  cacheLife('max')

  const section = await prisma.section.findFirst({
    where: { id: sectionId, deletedAt: null },
    include: {
      joinCode: true,
      _count: { select: { groups: true } },
      students: {
        where: { deletedAt: null },
        orderBy: { user: { name: 'asc' } },
        include: {
          user: {
            select: { id: true, name: true, email: true, loggedInAt: true },
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
      ? { name: s.group.groupName, members: s.group.students.length }
      : null,
  }))

  return {
    section: {
      id: section.id,
      name: section.section,
      yearLevel: section.yearLevel,
      accent: accentForYear(section.yearLevel),
      hasJoinCode: !!section.joinCode && !section.joinCode.deletedAt,
      joinCode:
        section.joinCode && !section.joinCode.deletedAt
          ? section.joinCode.code
          : null,
      joinCodeExpiresAt: section.joinCode?.expiresAt.toISOString() ?? null,
      dateCreated: section.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      studentsCount: students.length,
      groupsCount: section._count.groups,
    },
    students,
  }
}

// Returns the live coordinator record for the current user, or null.
async function requireCoordinatorRow() {
  const session = await requireCoordinator()
  if (!session) return null
  return prisma.coordinator.findFirst({
    where: {
      faculty: { userId: +session.user.id, deletedAt: null },
      deletedAt: null,
    },
  })
}

export async function getCoordinatorSections() {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }
  const payload = await getCoordinatorSectionsData(coordinator.id)
  return { success: true, message: '', payload }
}

export async function getCoordinatorSectionBySlug(slug: string) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  try {
    const section = await prisma.section.findFirst({
      where: {
        coordinatorId: coordinator.id,
        deletedAt: null,
        section: { equals: unslugify(slug), mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (!section) {
      return { success: false, message: 'Section not found', payload: null }
    }

    const payload = await getCoordinatorSectionData(section.id)
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getCoordinatorSectionBySlug | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch section',
      payload: null,
    }
  }
}

export async function createSection(_prevState: any, formData: FormData) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  const yearLevel = formData.get('yearLevel')?.toString().trim() ?? ''
  const sectionLetter = formData.get('section')?.toString().trim().toUpperCase() ?? ''
  const groupNumber = formData.get('groupNumber')?.toString().trim() ?? ''

  if (!['3rd Year', '4th Year'].includes(yearLevel)) {
    return { success: false, message: 'Please choose a valid year level.' }
  }
  if (!/^[A-Z]$/.test(sectionLetter)) {
    return { success: false, message: 'Please choose a valid section letter.' }
  }
  if (groupNumber !== '1' && groupNumber !== '2') {
    return { success: false, message: 'Please choose a valid group number.' }
  }

  const name = `${yearLevel === '4th Year' ? 4 : 3}${sectionLetter}G${groupNumber}`

  const existing = await prisma.section.findFirst({ where: { section: name } })
  if (existing && !existing.deletedAt) {
    return { success: false, message: `Section ${name} already exists.` }
  }

  try {
    const code = generateJoinCode()
    const expiresAt = new Date(Date.now() + JOIN_CODE_TTL_MS)

    if (existing && existing.deletedAt) {
      // Resurrect a previously removed section and reassign it to this
      // coordinator with a fresh join code.
      if (existing.joinCodeId) {
        await prisma.joinCode.update({
          where: { id: existing.joinCodeId },
          data: { deletedAt: new Date() },
        })
      }
      const joinCode = await prisma.joinCode.create({
        data: { code, type: 'STUDENT', expiresAt },
      })
      await prisma.section.update({
        where: { id: existing.id },
        data: {
          coordinatorId: coordinator.id,
          yearLevel,
          joinCodeId: joinCode.id,
          deletedAt: null,
        },
      })
    } else {
      const joinCode = await prisma.joinCode.create({
        data: { code, type: 'STUDENT', expiresAt },
      })
      await prisma.section.create({
        data: {
          coordinatorId: coordinator.id,
          section: name,
          yearLevel,
          joinCodeId: joinCode.id,
        },
      })
    }

    revalidateCoordinatorCache()
    return { success: true, message: `Section ${name} created successfully.` }
  } catch (error) {
    console.error('[createSection | Error]:', error)
    return { success: false, message: 'Failed to create section.' }
  }
}

export async function updateSection(_prevState: any, formData: FormData) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  const sectionId = parseInt(formData.get('sectionId')?.toString() ?? '')
  if (Number.isNaN(sectionId)) {
    return { success: false, message: 'Invalid section.' }
  }

  const yearLevel = formData.get('yearLevel')?.toString().trim() ?? ''
  const sectionLetter = formData.get('section')?.toString().trim().toUpperCase() ?? ''
  const groupNumber = formData.get('groupNumber')?.toString().trim() ?? ''

  if (!['3rd Year', '4th Year'].includes(yearLevel)) {
    return { success: false, message: 'Please choose a valid year level.' }
  }
  if (!/^[A-Z]$/.test(sectionLetter)) {
    return { success: false, message: 'Please choose a valid section letter.' }
  }
  if (groupNumber !== '1' && groupNumber !== '2') {
    return { success: false, message: 'Please choose a valid group number.' }
  }

  const name = `${yearLevel === '4th Year' ? 4 : 3}${sectionLetter}G${groupNumber}`

  try {
    const current = await prisma.section.findFirst({
      where: { id: sectionId, coordinatorId: coordinator.id, deletedAt: null },
    })
    if (!current) {
      return { success: false, message: 'Section not found.' }
    }

    if (current.section === name) {
      return { success: true, message: 'No changes to save.' }
    }

    const target = await prisma.section.findFirst({ where: { section: name } })
    if (target && !target.deletedAt) {
      return { success: false, message: `Section ${name} already exists.` }
    }

    if (target && target.deletedAt) {
      // Resurrect-on-edit (swap): revive the target, transfer this section's
      // join code, students and groups onto it, then soft-delete the old row.
      if (target.joinCodeId && target.joinCodeId !== current.joinCodeId) {
        await prisma.joinCode.update({
          where: { id: target.joinCodeId },
          data: { deletedAt: new Date() },
        })
      }
      await prisma.$transaction([
        prisma.section.update({
          where: { id: current.id },
          data: { joinCodeId: null },
        }),
        prisma.section.update({
          where: { id: target.id },
          data: {
            coordinatorId: coordinator.id,
            yearLevel,
            joinCodeId: current.joinCodeId,
            deletedAt: null,
          },
        }),
        prisma.student.updateMany({
          where: { sectionId: current.id },
          data: { sectionId: target.id },
        }),
        prisma.group.updateMany({
          where: { sectionId: current.id },
          data: { sectionId: target.id },
        }),
        prisma.section.update({
          where: { id: current.id },
          data: { deletedAt: new Date() },
        }),
      ])
    } else {
      await prisma.section.update({
        where: { id: current.id },
        data: { section: name, yearLevel },
      })
    }

    revalidateCoordinatorCache(sectionId)
    return { success: true, message: `Section renamed to ${name}.` }
  } catch (error) {
    console.error('[updateSection | Error]:', error)
    return { success: false, message: 'Failed to update section.' }
  }
}

export async function removeSection(id: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  try {
    const section = await prisma.section.findFirst({
      where: { id, coordinatorId: coordinator.id, deletedAt: null },
    })
    if (!section) {
      return { success: false, message: 'Section not found.' }
    }

    const [studentCount, groupCount] = await prisma.$transaction([
      prisma.student.count({ where: { sectionId: section.id, deletedAt: null } }),
      prisma.group.count({ where: { sectionId: section.id } }),
    ])

    if (studentCount > 0 || groupCount > 0) {
      return {
        success: false,
        message: 'Only empty sections can be removed. Move or remove students first.',
      }
    }

    if (section.joinCodeId) {
      await prisma.joinCode.update({
        where: { id: section.joinCodeId },
        data: { deletedAt: new Date() },
      })
    }
    await prisma.section.update({
      where: { id: section.id },
      data: { deletedAt: new Date() },
    })

    revalidateCoordinatorCache(section.id)
    return { success: true, message: `Section ${section.section} removed.` }
  } catch (error) {
    console.error('[removeSection | Error]:', error)
    return { success: false, message: 'Failed to remove section.' }
  }
}

export async function removeStudentFromSection(studentId: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  try {
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        deletedAt: null,
        section: { coordinatorId: coordinator.id, deletedAt: null },
      },
    })
    if (!student) {
      return { success: false, message: 'Student not found in your section.' }
    }

    const groupId = student.groupId
    await prisma.student.update({
      where: { id: student.id },
      data: { groupId: null, deletedAt: new Date() },
    })

    // Business rule: a group cannot exist without a student.
    if (groupId) {
      const remaining = await prisma.student.count({
        where: { groupId, deletedAt: null },
      })
      if (remaining === 0) {
        await prisma.group.update({
          where: { id: groupId },
          data: { deletedAt: new Date() },
        })
      }
    }

    revalidateCoordinatorCache(student.sectionId)
    return { success: true, message: 'Student removed from the section.' }
  } catch (error) {
    console.error('[removeStudentFromSection | Error]:', error)
    return { success: false, message: 'Failed to remove student.' }
  }
}

export async function copySectionJoinCode(sectionId: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  try {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, coordinatorId: coordinator.id, deletedAt: null },
      include: { joinCode: true },
    })
    if (!section) {
      return { success: false, message: 'Section not found.', payload: null }
    }

    let joinCode = section.joinCode
    let regenerated = false

    if (!joinCode || joinCode.deletedAt || joinCode.expiresAt < new Date()) {
      if (joinCode) {
        await prisma.joinCode.update({
          where: { id: joinCode.id },
          data: { deletedAt: new Date() },
        })
      }
      joinCode = await prisma.joinCode.create({
        data: {
          code: generateJoinCode(),
          type: 'STUDENT',
          expiresAt: new Date(Date.now() + JOIN_CODE_TTL_MS),
        },
      })
      await prisma.section.update({
        where: { id: section.id },
        data: { joinCodeId: joinCode.id },
      })
      regenerated = true
      revalidateCoordinatorCache(section.id)
    }

    return {
      success: true,
      message: regenerated ? 'New code generated.' : 'Code is valid.',
      payload: { code: joinCode.code, regenerated },
    }
  } catch (error) {
    console.error('[copySectionJoinCode | Error]:', error)
    return { success: false, message: 'Failed to get invitation code.', payload: null }
  }
}
