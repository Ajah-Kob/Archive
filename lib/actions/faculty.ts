'use server'

import prisma from '@/lib/prisma'
import { getSession, requireAdmin, requireAdminOrProgramChair, unauthorized } from '@/lib/actions/guard'
import { validateFacultyCode } from '@/lib/actions/join-code'
import { timeAgo } from '@/lib/helper'
import {
  unstable_cacheTag as cacheTag,
  unstable_cacheLife as cacheLife,
} from 'next/cache'
import { revalidateTag } from 'next/cache'
import { revalidateFeature } from '@/lib/actions/revalidate'

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
        user: { select: { id: true, name: true, email: true, image: true } },
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
            select: {
              capstones: { where: { deletedAt: null } },
              groups: { where: { deletedAt: null } },
            },
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
      loggedInAt: f.user.loggedInAt,
      activityStatus: activityStatusFor(f.user.loggedInAt),
      isAdviser,
      isCoordinator,
      adviseeCount: isAdviser
        ? f.adviser._count.capstones + f.adviser._count.groups
        : 0,
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
          capstones: {
            where: { deletedAt: null },
            include: {
              group: {
                include: {
                  students: {
                    where: { deletedAt: null },
                    include: { section: true },
                  },
                },
              },
            },
          },
          groups: { where: { deletedAt: null }, select: { id: true } },
        },
      },
    },
  })

  if (!faculty) {
    return { success: false, message: 'Faculty not found.' }
  }

  const isAdviser = !!faculty.adviser && faculty.adviser.deletedAt === null
  const isCoordinator = !!faculty.coordinator && faculty.coordinator.deletedAt === null
  const capstones = isAdviser ? faculty.adviser.capstones : []

  const roles: string[] = []
  if (isAdviser) roles.push('Adviser')
  if (isCoordinator) roles.push('Coordinator')

  const groups = capstones.map((capstone) => {
    const liveStudents = capstone.group.students
    const section = liveStudents[0]?.section
    return {
      id: capstone.group.id,
      name: capstone.group.groupName,
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
      adviseeCount:
        capstones.length + (faculty.adviser?.groups.length ?? 0),
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
        select: {
          capstones: { where: { deletedAt: null } },
          groups: { where: { deletedAt: null } },
        },
      },
    },
  })

  const adviseeCount =
    (adviser?._count.capstones ?? 0) + (adviser?._count.groups ?? 0)
  if (adviseeCount > 0) {
    return {
      success: false,
      message: `Cannot remove faculty with ${adviseeCount} advisee group(s). Reassign the groups first.`,
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
  revalidateFeature('faculty-list')
  revalidateFeature('sections')

  return { success: true, message: 'Faculty removed.' }
}

export async function joinFaculty(formData: FormData) {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated' }
  }

  const code = formData.get('code')?.toString().trim()
  if (!code) {
    return { success: false, message: 'Please enter an invitation code.' }
  }

  const validation = await validateFacultyCode(code)
  if (!validation.success) {
    return { success: false, message: validation.message }
  }

  const existing = await prisma.faculty.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
  })
  if (existing) {
    return { success: false, message: 'You are already registered as faculty.' }
  }

  await prisma.faculty.create({
    data: { userId: +session.user.id },
  })

  await prisma.user.update({
    where: { id: +session.user.id },
    data: { role: 'FACULTY' },
  })

  revalidateTag('users', 'max')
  revalidateTag('faculty', 'max')
  revalidateFeature('faculty-list')

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
