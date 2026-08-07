'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidatePath, revalidateTag, updateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import type { SectionData } from '@/components/sections/main/SectionDataRow'
import type { StudentData } from '@/components/sections/students/StudentDataRow'
import { generateJoinCode, getInitials, timeAgo } from '@/lib/helper'
import { requireCoordinator } from '@/lib/actions/guard'
import { buildJourneyRows } from '@/lib/journey'
import type { JourneyRow } from '@/types/milestones'

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

export interface SectionGroupProgress {
  id: number
  name: string
  memberCount: number
  adviser: { name: string; email: string; image: string | null } | null
  topicStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'NEEDS_REVISION'
  journey: JourneyRow[]
}

export interface PendingTopic {
  id: number
  groupName: string
  title: string
  background: string
  submittedBy: string
  createdAt: string
}

export interface SectionDetailData {
  section: {
    id: number
    name: string
    coordinatorName: string
    studentsCount: number
    groupsCount: number
    capstone2OpenedAt: string | null
  }
  students: StudentData[]
  groups: SectionGroupProgress[]
  pendingTopics: PendingTopic[]
}

async function getSectionDetailData(id: number) {
  'use cache'
  cacheTag(`section-${id}`)
  cacheLife('max')

  const section = await prisma[table].findFirst({
    where: {
      id,
      deletedAt: null,
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

export async function getSectionById(id: number) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
  }

  try {
    const payload = await getSectionDetailData(id)
    if (!payload) {
      return { success: false, message: 'Section not found', payload: null }
    }
    return { success: true, payload }
  } catch (error) {
    console.error('[getSectionById | Error]:', error)
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
      where: { userId: +session.user.id },
    })

    if (existingStudent && !existingStudent.deletedAt) {
      return {
        success: false,
        message: 'You are already enrolled in a section.',
      }
    }

    if (existingStudent) {
      // Resurrect a previously removed student (soft-deleted row) instead of
      // creating a new one — Student.userId is unique, so a fresh create
      // would throw a constraint violation.
      await prisma.student.update({
        where: { id: existingStudent.id },
        data: {
          sectionId: joinCode.section.id,
          groupId: null,
          deletedAt: null,
        },
      })
    } else {
      await prisma.student.create({
        data: {
          userId: +session.user.id,
          sectionId: joinCode.section.id,
        },
      })
    }

    await prisma.user.update({
      where: { id: +session.user.id },
      data: { role: 'STUDENT' },
    })

    updateTag('users')
    updateTag('sections')
    updateTag('my-sections')
    updateTag(`my-section-${joinCode.section.id}`)
    revalidatePath('/sections')
    revalidatePath('/my-sections')
    revalidatePath(`/my-sections/${joinCode.section.id}`)

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
  students: number
  groups: number
  hasJoinCode: boolean
  joinCode: string | null
  joinCodeExpiresAt: string | null
  dateCreated: string
  pendingTopics: number
  capstone2OpenedAt: string | null
}

const JOIN_CODE_TTL_MS = 3 * 24 * 60 * 60 * 1000

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
      groups: {
        where: { deletedAt: null },
        include: {
          topics: {
            where: { status: 'PENDING', deletedAt: null },
            select: { id: true },
          },
        },
      },
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
        pendingTopics: s.groups.reduce((n, g) => n + g.topics.length, 0),
        capstone2OpenedAt: s.capstone2OpenedAt?.toISOString() ?? null,
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
      groups: {
        where: { deletedAt: null },
        include: {
          adviser: {
            include: {
              faculty: {
                include: {
                  user: {
                    select: { name: true, email: true, image: true },
                  },
                },
              },
            },
          },
          students: { where: { deletedAt: null }, select: { id: true } },
          topics: {
            where: { deletedAt: null },
            include: {
              uploadedBy: { include: { user: { select: { name: true } } } },
            },
          },
          capstone: { select: { topicId: true } },
          milestones: {
            where: { deletedAt: null },
            include: {
              submissions: {
                where: { deletedAt: null },
                select: { status: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          capstoneArchive: { select: { deletedAt: true } },
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

  const capstone2Open = !!section.capstone2OpenedAt

  const groups: SectionGroupProgress[] = section.groups.map((g) => {
    const activeTopics = g.topics.filter((t) => !t.deletedAt)
    let topicStatus: SectionGroupProgress['topicStatus'] = 'NONE'
    if (activeTopics.some((t) => t.status === 'PENDING')) {
      topicStatus = 'PENDING'
    } else if (activeTopics.some((t) => t.status === 'NEED_REVISION')) {
      topicStatus = 'NEEDS_REVISION'
    } else if (activeTopics.some((t) => t.status === 'APPROVED')) {
      topicStatus = 'APPROVED'
    }

    return {
      id: g.id,
      name: g.groupName,
      memberCount: g.students.length,
      adviser: g.adviser
        ? {
            name: g.adviser.faculty.user.name,
            email: g.adviser.faculty.user.email,
            image: g.adviser.faculty.user.image,
          }
        : null,
      topicStatus,
      journey: buildJourneyRows(
        {
          topics: activeTopics.map((t) => ({
            status: t.status,
            deletedAt: t.deletedAt,
          })),
          capstone: g.capstone ? { topicId: g.capstone.topicId } : null,
          milestones: g.milestones.map((m) => ({
            chapter: m.chapter,
            submissions: m.submissions,
          })),
          capstoneArchive: g.capstoneArchive,
        },
        capstone2Open,
      ),
    }
  })

  const pendingTopics: PendingTopic[] = section.groups
    .flatMap((g) =>
      g.topics
        .filter((t) => t.status === 'PENDING' && !t.deletedAt)
        .map((t) => ({ topic: t, groupName: g.groupName })),
    )
    .sort((a, b) => b.topic.createdAt.getTime() - a.topic.createdAt.getTime())
    .map(({ topic, groupName }) => ({
      id: topic.id,
      groupName,
      title: topic.title,
      background: topic.background,
      submittedBy: topic.uploadedBy?.user.name ?? '',
      createdAt: topic.createdAt.toISOString(),
    }))

  return {
    section: {
      id: section.id,
      name: section.section,
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
      capstone2OpenedAt: section.capstone2OpenedAt?.toISOString() ?? null,
    },
    students,
    groups,
    pendingTopics,
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
    include: { faculty: { select: { userId: true } } },
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

export async function getCoordinatorSectionById(id: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  try {
    const section = await prisma.section.findFirst({
      where: {
        id,
        coordinatorId: coordinator.id,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!section) {
      return { success: false, message: 'Section not found', payload: null }
    }

    const payload = await getCoordinatorSectionData(section.id)
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getCoordinatorSectionById | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch section',
      payload: null,
    }
  }
}

const SECTION_NAME_PATTERN = /^[A-Za-z0-9 .-]+$/

function validateSectionName(raw: string): string | null {
  const name = raw.trim()
  if (name.length < 3 || name.length > 60) {
    return 'Section name must be between 3 and 60 characters.'
  }
  if (name !== raw) {
    return 'Section name cannot have leading or trailing spaces.'
  }
  if (!SECTION_NAME_PATTERN.test(name)) {
    return 'Section name can only contain letters, numbers, spaces, periods, and dashes.'
  }
  return name
}

export async function createSection(_prevState: any, formData: FormData) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  const name = validateSectionName(formData.get('name')?.toString() ?? '')
  if (typeof name !== 'string') {
    return { success: false, message: name }
  }

  const existing = await prisma.section.findFirst({
    where: {
      coordinatorId: coordinator.id,
      section: { equals: name, mode: 'insensitive' },
    },
  })
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

  const name = validateSectionName(formData.get('name')?.toString() ?? '')
  if (typeof name !== 'string') {
    return { success: false, message: name }
  }

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

    const target = await prisma.section.findFirst({
      where: {
        coordinatorId: coordinator.id,
        section: { equals: name, mode: 'insensitive' },
      },
    })
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
        data: { section: name },
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
    await prisma.$transaction([
      prisma.student.update({
        where: { id: student.id },
        data: { groupId: null, deletedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: student.userId },
        data: { role: 'GUEST' },
      }),
    ])

    // Business rule: a group cannot exist without a student.
    if (groupId) {
      const remaining = await prisma.student.findMany({
        where: { groupId, deletedAt: null },
        orderBy: { id: 'asc' },
        select: { id: true },
      })
      if (remaining.length === 0) {
        await prisma.group.update({
          where: { id: groupId },
          data: { deletedAt: new Date(), leaderStudentId: null },
        })
      } else {
        // If the removed student led the group, auto-transfer leadership to
        // the earliest remaining member (lowest Student.id).
        const group = await prisma.group.findFirst({
          where: { id: groupId },
          select: { leaderStudentId: true },
        })
        if (
          group &&
          (group.leaderStudentId === null || group.leaderStudentId === student.id)
        ) {
          await prisma.group.update({
            where: { id: groupId },
            data: { leaderStudentId: remaining[0].id },
          })
        }
      }
    }

    revalidateCoordinatorCache(student.sectionId)
    revalidateTag('users', 'max')
    revalidatePath('/dashboard/users')
    revalidateTag(`workspace-${student.userId}`, 'max')
    revalidateTag(`classmates-${student.userId}`, 'max')
    if (groupId) revalidateTag(`journey-${groupId}`, 'max')
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

// ───────────────────────────── Milestone phases & topic review ─────────────────────────────

// Coordinator reviews a pending topic proposal from a group in their section.
// Approving unlocks the group's Topic Selection step (see buildJourneyRows).
export async function reviewTopic(
  topicId: number,
  decision: 'APPROVED' | 'NEED_REVISION',
  note?: string,
) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  try {
    const topic = await prisma.topic.findFirst({
      where: {
        id: topicId,
        status: 'PENDING',
        deletedAt: null,
        group: {
          deletedAt: null,
          section: { coordinatorId: coordinator.id, deletedAt: null },
        },
      },
      include: {
        group: {
          select: {
            id: true,
            sectionId: true,
            students: {
              where: { deletedAt: null },
              select: { userId: true },
            },
          },
        },
      },
    })
    if (!topic) {
      return { success: false, message: 'Topic not found in your sections.' }
    }

    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        status: decision,
        reviewNote: note?.trim() || null,
        reviewedById: coordinator.faculty.userId,
        reviewedAt: new Date(),
      },
    })

    revalidateTag('my-sections', 'max')
    revalidateTag(`my-section-${topic.group.sectionId}`, 'max')
    revalidateTag(`journey-${topic.group.id}`, 'max')
    for (const student of topic.group.students) {
      revalidateTag(`workspace-${student.userId}`, 'max')
    }

    return {
      success: true,
      message:
        decision === 'APPROVED'
          ? 'Topic approved.'
          : 'Revision requested for this topic.',
    }
  } catch (error) {
    console.error('[reviewTopic | Error]:', error)
    return { success: false, message: 'Failed to review the topic.' }
  }
}

// Coordinator opens Capstone 2 for a section. This unlocks Chapter 4/5 in the
// affected groups' journeys and records when the phase opened.
export async function openCapstone2(sectionId: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  try {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, coordinatorId: coordinator.id, deletedAt: null },
      include: {
        students: { where: { deletedAt: null }, select: { userId: true } },
        groups: { where: { deletedAt: null }, select: { id: true } },
      },
    })
    if (!section) {
      return { success: false, message: 'Section not found.' }
    }
    if (section.capstone2OpenedAt) {
      return {
        success: true,
        message: 'Capstone 2 is already open for this section.',
      }
    }

    await prisma.section.update({
      where: { id: section.id },
      data: { capstone2OpenedAt: new Date() },
    })

    revalidateTag('my-sections', 'max')
    revalidateTag('sections', 'max')
    revalidateTag(`my-section-${section.id}`, 'max')
    for (const student of section.students) {
      revalidateTag(`workspace-${student.userId}`, 'max')
    }
    for (const group of section.groups) {
      revalidateTag(`journey-${group.id}`, 'max')
    }

    return {
      success: true,
      message: 'Capstone 2 is now open for this section.',
    }
  } catch (error) {
    console.error('[openCapstone2 | Error]:', error)
    return { success: false, message: 'Failed to open Capstone 2.' }
  }
}

export interface SectionGroupMember {
  id: number
  name: string
  email: string
  image: string | null
  isLeader: boolean
}

export interface SectionGroupTopic {
  id: number
  title: string
  status: 'PENDING' | 'APPROVED' | 'NEED_REVISION'
  note: string | null
  submittedBy: string
  createdAt: string
}

export interface SectionGroupDetail {
  id: number
  name: string
  capstone2OpenedAt: string | null
  members: SectionGroupMember[]
  adviser: { name: string; email: string; image: string | null } | null
  topics: SectionGroupTopic[]
  journey: JourneyRow[]
}

// Live per-group detail for the coordinator progress drawer. Not 'use cache':
// the drawer fetches on open so it never shows stale data.
export async function getCoordinatorGroupDetail(groupId: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return {
      success: false,
      message: 'You are not authorized to perform this action.',
      payload: null,
    }
  }

  try {
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        deletedAt: null,
        section: { coordinatorId: coordinator.id, deletedAt: null },
      },
      include: {
        section: { select: { capstone2OpenedAt: true } },
        students: {
          where: { deletedAt: null },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        adviser: {
          include: {
            faculty: {
              include: {
                user: { select: { name: true, email: true, image: true } },
              },
            },
          },
        },
        topics: {
          where: { deletedAt: null },
          include: {
            uploadedBy: { include: { user: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
        capstone: { select: { topicId: true } },
        milestones: {
          where: { deletedAt: null },
          include: {
            submissions: {
              where: { deletedAt: null },
              select: { status: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        capstoneArchive: { select: { deletedAt: true } },
      },
    })
    if (!group) {
      return {
        success: false,
        message: 'Group not found in your sections.',
        payload: null,
      }
    }

    const journey = buildJourneyRows(
      {
        topics: group.topics.map((t) => ({
          status: t.status,
          deletedAt: t.deletedAt,
        })),
        capstone: group.capstone ? { topicId: group.capstone.topicId } : null,
        milestones: group.milestones.map((m) => ({
          chapter: m.chapter,
          submissions: m.submissions,
        })),
        capstoneArchive: group.capstoneArchive,
      },
      !!group.section.capstone2OpenedAt,
    )

    return {
      success: true,
      message: '',
      payload: {
        id: group.id,
        name: group.groupName,
        capstone2OpenedAt: group.section.capstone2OpenedAt?.toISOString() ?? null,
        members: group.students.map((s) => ({
          id: s.id,
          name: s.user.name,
          email: s.user.email,
          image: s.user.image,
          isLeader: group.leaderStudentId === s.id,
        })),
        adviser: group.adviser
          ? {
              name: group.adviser.faculty.user.name,
              email: group.adviser.faculty.user.email,
              image: group.adviser.faculty.user.image,
            }
          : null,
        topics: group.topics.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status as 'PENDING' | 'APPROVED' | 'NEED_REVISION',
          note: t.reviewNote,
          submittedBy: t.uploadedBy?.user.name ?? '',
          createdAt: t.createdAt.toISOString(),
        })),
        journey,
      } satisfies SectionGroupDetail,
    }
  } catch (error) {
    console.error('[getCoordinatorGroupDetail | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch group.',
      payload: null,
    }
  }
}
