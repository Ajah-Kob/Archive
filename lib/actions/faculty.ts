'use server'

import prisma from '@/lib/prisma'
import { getSession, requireAdmin, requireAdminOrProgramChair, unauthorized } from '@/lib/actions/guard'
import { validateFacultyCode } from '@/lib/actions/join-code'
import { timeAgo } from '@/lib/helper'
import {
  cacheTag,
  cacheLife,
} from 'next/cache'
import { revalidateTag } from 'next/cache'
import { revalidateFeature } from '@/lib/actions/revalidate'
import { audit } from '@/lib/actions/audit'

// A faculty member is considered "active now" if they signed in within this window.
const ACTIVE_NOW_MS = 5 * 60 * 1000

function activityStatusFor(loggedInAt: Date | null): 'active' | string {
  if (!loggedInAt) return 'Never'
  if (Date.now() - loggedInAt.getTime() < ACTIVE_NOW_MS) return 'active'
  return timeAgo(loggedInAt)
}

async function getAvailableFacultyData() {
  try {
    const faculty = await prisma.faculty.findMany({
      where: {
        deletedAt: null,
        coordinator: { isNot: { deletedAt: null } },
        isProgramChair: false,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, avatarGradient: true } },
      },
      orderBy: { id: 'asc' },
    })

    return { success: true, payload: faculty }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to get available faculty',
    }
  }
}

export async function getAvailableFaculty() {
  return getAvailableFacultyData()
}

export async function getFacultyMembers() {
  'use cache'
  cacheTag('faculty')
  cacheLife('seconds')

  const faculty = await prisma.faculty.findMany({
    where: { deletedAt: null },
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
          _count: {
            select: { section: { where: { deletedAt: null } } },
          },
        },
      },
      adviser: {
        include: {
          _count: {
            select: { groups: { where: { deletedAt: null } } },
          },
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  const payload = faculty.map((f) => {
    const isAdviser = !!f.adviser && f.adviser.deletedAt === null
    const isCoordinator = !!f.coordinator && f.coordinator.deletedAt === null
    return {
      id: f.id,
      userId: f.userId,
      name: f.user.name,
      email: f.user.email,
      image: f.user.image,
      avatarGradient: (f.user as any).avatarGradient,
      loggedInAt: f.user.loggedInAt,
      activityStatus: activityStatusFor(f.user.loggedInAt),
      isAdviser,
      isCoordinator,
      // Workload = distinct groups currently advised. Capstone.adviserId is a
      // denormalized snapshot — never sum it on top of Group.adviserId.
      groupCount: isAdviser ? f.adviser._count.groups : 0,
      sectionsManaged: isCoordinator ? f.coordinator._count.section : 0,
    }
  })

  return { success: true, payload }
}

export async function getFacultyMemberDetail(facultyId: number) {
  'use cache'
  cacheTag(`faculty-${facultyId}`)
  cacheLife('max')

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
          _count: {
            select: { section: { where: { deletedAt: null } } },
          },
        },
      },
      adviser: {
        include: {
          groups: {
            where: { deletedAt: null },
            include: {
              students: {
                where: { deletedAt: null },
                include: { section: true },
              },
            },
          },
        },
      },
    },
  })

  if (!faculty) {
    return { success: false, message: 'Faculty not found.' }
  }

  const isAdviser = !!faculty.adviser && faculty.adviser.deletedAt === null
  const isCoordinator = !!faculty.coordinator && faculty.coordinator.deletedAt === null
  const advisedGroups = isAdviser ? faculty.adviser.groups : []

  const roles: string[] = []
  if (isAdviser) roles.push('Adviser')
  if (isCoordinator) roles.push('Coordinator')

  // List every advised group (not just those with a confirmed capstone) so
  // this list matches the workload count in the faculty table.
  const groups = advisedGroups.map((group) => {
    const liveStudents = group.students
    const section = liveStudents[0]?.section
    return {
      id: group.id,
      name: group.groupName,
      sectionLabel: section ? section.section : 'No section',
      memberCount: liveStudents.length,
    }
  })

  return {
    success: true,
    payload: {
      id: faculty.id,
      userId: faculty.userId,
      name: faculty.user.name,
      email: faculty.user.email,
      image: faculty.user.image,
      loggedInAt: faculty.user.loggedInAt,
      activityStatus: activityStatusFor(faculty.user.loggedInAt),
      roles,
      groupCount: advisedGroups.length,
      sectionsManaged: isCoordinator ? faculty.coordinator._count.section : 0,
      groups,
    },
  }
}

export async function removeFaculty(facultyId: number) {
  const session = await requireAdminOrProgramChair()
  if (!session) return unauthorized

  const faculty = await prisma.faculty.findFirst({
    where: { id: facultyId, deletedAt: null },
    include: {
      coordinator: {
        include: {
          _count: {
            select: { section: { where: { deletedAt: null } } },
          },
        },
      },
    },
  })
  if (!faculty) {
    return { success: false, message: 'Faculty not found.' }
  }

  const adviser = await prisma.adviser.findFirst({
    where: { facultyId, deletedAt: null },
    include: {
      _count: {
        select: { groups: { where: { deletedAt: null } } },
      },
    },
  })

  const groupCount = adviser?._count.groups ?? 0
  if (groupCount > 0) {
    return {
      success: false,
      message: `Cannot remove faculty with ${groupCount} advisee group(s). Reassign the groups first.`,
    }
  }

  const liveCoordinator =
    !!faculty.coordinator && faculty.coordinator.deletedAt === null
  const sectionCount = liveCoordinator ? faculty.coordinator._count.section : 0
  if (sectionCount > 0) {
    return {
      success: false,
      message: `Cannot remove faculty managing ${sectionCount} section(s). Reassign the sections first.`,
    }
  }

  await prisma.$transaction([
    prisma.faculty.update({
      where: { id: facultyId },
      data: { deletedAt: new Date() },
    }),
    ...(adviser
      ? [
          prisma.adviser.update({
            where: { id: adviser.id },
            data: { deletedAt: new Date() },
          }),
        ]
      : []),
    ...(liveCoordinator
      ? [
          prisma.coordinator.update({
            where: { id: faculty.coordinator.id },
            data: { deletedAt: new Date() },
          }),
        ]
      : []),
    prisma.user.update({
      where: { id: faculty.userId },
      data: { role: 'GUEST' },
    }),
  ])

  revalidateTag('faculty', 'max')
  revalidateTag('coordinators', 'max')
  revalidateFeature('faculties')
  revalidateFeature('sections')

  return { success: true, message: 'Faculty removed.' }
}

export async function joinFaculty(formData: FormData) {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated' }
  }

  // Codes are stored UPPERCASE — normalize input so pasted lowercase works.
  const code = formData.get('code')?.toString().trim().toUpperCase()
  if (!code) {
    return { success: false, message: 'Please enter an invitation code.' }
  }

  return joinFacultyWithCode(+session.user.id, code)
}

// Shared core behind joinFaculty and the one-click /join/[code] route.
// Takes an explicit userId + code so both callers run identical guards.
export async function joinFacultyWithCode(userId: number, code: string) {
  const validation = await validateFacultyCode(code)
  if (!validation.success) {
    return { success: false, message: validation.message }
  }

  const existing = await prisma.faculty.findFirst({
    where: { userId, deletedAt: null },
  })
  if (existing) {
    return { success: false, message: 'You are already registered as faculty.' }
  }

  await prisma.faculty.create({
    data: { userId },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { role: 'FACULTY' },
  })

  revalidateTag('users', 'max')
  revalidateTag('faculty', 'max')
  revalidateFeature('faculties')

  return { success: true, message: 'Faculty registration successful.' }
}

export async function toggleProgramChair(id: number) {
  const session = await requireAdmin()
  if (!session) {
    return { success: false, message: 'Not authorized' }
  }

  try {
    let target = await prisma.faculty.findFirst({
      where: { userId: id, deletedAt: null },
      include: { user: true },
    })

    if (!target) {
      const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
      })
      if (!user || user.role !== 'FACULTY') {
        return { success: false, message: 'Only faculty can be program chair' }
      }
      target = await prisma.faculty.create({
        data: { userId: id, isProgramChair: false },
        include: { user: true },
      })
    }

    const newValue = !target.isProgramChair

    if (newValue) {
      await prisma.faculty.updateMany({
        where: { isProgramChair: true },
        data: { isProgramChair: false },
      })
    }

    await prisma.faculty.update({
      where: { id: target.id },
      data: { isProgramChair: newValue },
    })

    revalidateTag('users', 'max')
    revalidateFeature('users')

    try {
      await audit({
        action: "USER_ROLE_UPDATE",
        entity: "USER",
        entityId: String(target.userId ?? id),
        entityName: target.user.email ?? target.user.name,
        before: { isProgramChair: target.isProgramChair, userId: target.userId, name: target.user.name },
        after: { isProgramChair: newValue, userId: target.userId, name: target.user.name },
      })
    } catch {}

    return {
      success: true,
      message: newValue
        ? `${target.user.name} is now the Program Chair`
        : `${target.user.name} is no longer Program Chair`,
    }
  } catch {
    return { success: false, message: 'Failed to toggle program chair' }
  }
}
