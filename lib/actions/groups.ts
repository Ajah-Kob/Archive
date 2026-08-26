'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireStudent, requireUser, unauthorized } from '@/lib/actions/guard'
import { ADVISER_CAP } from '@/config/constants'
import { buildJourneyRows, resolveSectionAvailability } from '@/lib/journey'
import {
  GROUP_CAP,
  type AdviserOption,
  type AdviserState,
  type Classmate,
  type WorkspaceData,
} from '@/types/milestones'

function revalidateWorkspace(userId?: number, groupId?: number) {
  if (userId) revalidateTag(`workspace-${userId}`, 'max')
  if (groupId) revalidateTag(`journey-${groupId}`, 'max')
  revalidateTag('sections', 'max')
  revalidateTag('my-sections', 'max')
}

function revalidateAdviserCaches() {
  revalidateTag('advisers', 'max')
  revalidateTag('faculty', 'max')
}

// ───────────────────────────── Reads ─────────────────────────────

// The full student workspace: section, group (members / adviser / invites)
// and the derived journey rows. Read uncached so topic status and the
// journey always reflect the persisted state on every load.
export async function getMyWorkspace(userId: number): Promise<{
  success: boolean
  message: string
  payload: WorkspaceData | null
}> {
  const student = await prisma.student.findFirst({
    where: { userId, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      section: {
        select: {
          id: true,
          section: true,
          capstone2OpenedAt: true,
          milestoneAvailability: { select: { key: true, openedAt: true } },
        },
      },
      group: {
        include: {
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
                  user: { select: { id: true, name: true, email: true, image: true } },
                },
              },
            },
          },
          invitations: {
            where: { deletedAt: null },
            include: {
              student: {
                include: {
                  user: { select: { id: true, name: true, email: true, image: true } },
                },
              },
              faculty: {
                include: {
                  user: { select: { id: true, name: true, email: true, image: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          topics: {
            where: { deletedAt: null },
            select: { status: true, deletedAt: true },
          },
          capstone: { select: { topicId: true } },
          milestones: {
            where: { deletedAt: null },
            include: {
              submissions: {
                where: { deletedAt: null },
                select: { status: true, deletedAt: true },
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

  if (!student) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  const base = {
    student: {
      id: student.id,
      userId: student.user.id,
      name: student.user.name,
      email: student.user.email,
      image: student.user.image,
    },
    section: { id: student.section.id, name: student.section.section },
  }

  const availability = resolveSectionAvailability(
    !!student.section.capstone2OpenedAt,
    student.section.milestoneAvailability,
  )

  if (!student.group) {
    return {
      success: true,
      message: '',
      payload: { ...base, group: null, journey: buildJourneyRows(null, availability) },
    }
  }

  const group = student.group

  const isLeader = group.leaderStudentId === student.id
  const members = group.students.map((s) => ({
    id: s.id,
    userId: s.user.id,
    name: s.user.name,
    email: s.user.email,
    image: s.user.image,
    isLeader: s.id === group.leaderStudentId,
  }))

  // Adviser state: assigned (accepted) > pending (invite out) > none.
  let adviser: AdviserState = { state: 'none', canManage: isLeader }

  if (group.adviser) {
    const adviserRecord = group.adviser
    // Workload = distinct groups currently advised. Capstone.adviserId is a
    // denormalized snapshot — never sum it on top of Group.adviserId.
    const workload = await prisma.group.count({
      where: { adviserId: adviserRecord.id, deletedAt: null },
    })
    adviser = {
      state: 'assigned',
      canManage: isLeader,
      facultyId: adviserRecord.facultyId,
      name: adviserRecord.faculty.user.name,
      email: adviserRecord.faculty.user.email,
      image: adviserRecord.faculty.user.image,
      workload,
      atCap: workload >= ADVISER_CAP,
    }
  } else {
    const pendingAdviser = group.invitations.find(
      (i) => i.role === 'ADVISER_ASSIGNMENT' && i.status === 'PENDING',
    )
    if (pendingAdviser) {
      const facultyUser = pendingAdviser.faculty?.user
      adviser = {
        state: 'pending',
        canManage: isLeader,
        invitationId: pendingAdviser.id,
        facultyId: pendingAdviser.facultyId,
        name: facultyUser?.name,
        email: facultyUser?.email,
        image: facultyUser?.image ?? null,
      }
    }
  }

  const invitations = group.invitations
    .filter((i) => i.role === 'GROUP' && i.student)
    .map((i) => ({
      id: i.id,
      studentId: i.studentId,
      name: i.student.user.name,
      email: i.student.user.email,
      image: i.student.user.image,
      status: i.status,
    }))
  const pendingCount = invitations.filter((i) => i.status === 'PENDING').length

  const payload: WorkspaceData = {
    ...base,
    group: {
      id: group.id,
      name: group.groupName,
      isLeader,
      memberCount: members.length,
      pendingCount,
      members,
      adviser,
      invitations,
    },
    journey: buildJourneyRows(group, availability),
  }

  return { success: true, message: '', payload }
}

// Group context for the group-scoped milestone routes. Returns the group the
// authenticated student belongs to ONLY when it matches the requested id, so a
// student can never read another group's header. Plain action (no 'use cache'):
// the header must reflect a rename immediately and it is a single indexed lookup.
export async function getGroupContext(groupId: number): Promise<{
  success: boolean
  message: string
  payload: { id: number; name: string; isLeader: boolean; topicTitle: string | null } | null
}> {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: {
      group: {
        select: {
          id: true,
          groupName: true,
          leaderStudentId: true,
          topics: {
            where: { deletedAt: null, status: 'APPROVED' },
            select: { title: true },
            take: 1,
            orderBy: { reviewedAt: 'desc' },
          },
        },
      },
    },
  })
  if (!student?.group || student.group.id !== groupId) {
    return { success: false, message: 'Group not found', payload: null }
  }

  return {
    success: true,
    message: '',
    payload: {
      id: student.group.id,
      name: student.group.groupName,
      isLeader: student.group.leaderStudentId === student.id,
      topicTitle: student.group.topics[0]?.title ?? null,
    },
  }
}

// Same-section classmates who are not yet in a group and can be invited.
// Plain server action (no 'use cache'): the picker must show current data on
// every open — a cached entry would go stale indefinitely because no page
// render reads this tag, and 'max'-profile revalidation is page-driven.
export async function getAvailableClassmates(): Promise<{
  success: boolean
  message: string
  payload: Classmate[] | null
}> {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const leader = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    select: { id: true, sectionId: true, groupId: true },
  })
  if (!leader) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  const classmates = await prisma.student.findMany({
    where: {
      sectionId: leader.sectionId,
      groupId: null,
      deletedAt: null,
      id: { not: leader.id },
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  let invitedIds: number[] = []
  if (leader.groupId) {
    const pendingInvites = await prisma.invitation.findMany({
      where: {
        groupId: leader.groupId,
        role: 'GROUP',
        status: 'PENDING',
        deletedAt: null,
      },
      select: { studentId: true },
    })
    invitedIds = pendingInvites.map((i) => i.studentId)
  }

  const invitedSet = new Set(invitedIds)

  const payload: Classmate[] = classmates.map((s) => ({
    id: s.id,
    userId: s.user.id,
    name: s.user.name,
    email: s.user.email,
    image: s.user.image,
    invited: invitedSet.has(s.id),
  }))

  return { success: true, message: '', payload }
}

// All active faculty (coordinators and program chair included) with workload.
// Plain server action (no 'use cache') — see getAvailableClassmates for why
// client-invoked picker queries must not be cached.
export async function getAvailableAdvisers(): Promise<{
  success: boolean
  message: string
  payload: AdviserOption[] | null
}> {
  const session = await requireUser()
  if (!session?.user?.id) return unauthorized

  const faculty = await prisma.faculty.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      adviser: {
        include: {
          groups: { where: { deletedAt: null }, select: { id: true } },
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  })

  const payload: AdviserOption[] = faculty.map((f) => {
    const workload = f.adviser?.groups.length ?? 0
    return {
      id: f.id,
      userId: f.userId,
      name: f.user.name,
      email: f.user.email,
      image: f.user.image,
      workload,
      atCap: workload >= ADVISER_CAP,
    }
  })

  return { success: true, message: '', payload }
}

// ───────────────────────────── Mutations ─────────────────────────────

// Creates a group with the caller as leader. Members are invited afterwards
// from the group dashboard (leader-only, via inviteGroupMembers).
export async function createGroup(name: string) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const cleanName = name.trim()
  if (!cleanName) {
    return { success: false, message: 'Group name is required.' }
  }
  if (cleanName.length > 50) {
    return { success: false, message: 'Group name must be 50 characters or fewer.' }
  }

  const leader = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    select: { id: true, sectionId: true, groupId: true },
  })
  if (!leader) return { success: false, message: 'Student record not found.' }
  if (leader.groupId) {
    return { success: false, message: 'You are already in a group.' }
  }

  const duplicate = await prisma.group.findFirst({
    where: {
      sectionId: leader.sectionId,
      groupName: { equals: cleanName, mode: 'insensitive' },
      deletedAt: null,
    },
    select: { id: true },
  })
  if (duplicate) {
    return {
      success: false,
      message: 'A group with this name already exists in your section.',
    }
  }

  try {
    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          groupName: cleanName,
          sectionId: leader.sectionId,
          leaderStudentId: leader.id,
        },
      })
      await tx.student.update({
        where: { id: leader.id },
        data: { groupId: created.id },
      })
      return created
    })

    revalidateTag(`workspace-${session.user.id}`, 'max')
    revalidateTag(`classmates-${session.user.id}`, 'max')
    revalidateTag('sections', 'max')
    revalidateTag('my-sections', 'max')

    return {
      success: true,
      message: 'Group created successfully.',
      payload: { groupId: group.id },
    }
  } catch {
    return { success: false, message: 'Failed to create group.' }
  }
}

// Leader-only: invite more section-mates into an existing group (up to the cap).
export async function inviteGroupMembers(memberIds: number[]) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true, sectionId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can invite members.' }
  }

  const memberCount = await prisma.student.count({
    where: { groupId: student.group.id, deletedAt: null },
  })
  const remaining = GROUP_CAP - memberCount
  if (remaining <= 0) {
    return { success: false, message: `Your group is already full (${GROUP_CAP} members).` }
  }

  const memberIdsUnique = [...new Set(memberIds)]
  if (memberIdsUnique.length === 0) {
    return { success: false, message: 'Select at least one classmate to invite.' }
  }
  if (memberIdsUnique.length > remaining) {
    return { success: false, message: `You can invite up to ${remaining} more classmates.` }
  }

  const groupId = student.group.id
  const classmates = await prisma.student.findMany({
    where: {
      id: { in: memberIdsUnique },
      sectionId: student.group.sectionId,
      groupId: null,
      deletedAt: null,
    },
    include: { user: { select: { id: true } } },
  })
  if (classmates.length !== memberIdsUnique.length) {
    return {
      success: false,
      message: 'Some selected students are no longer available.',
    }
  }

  try {
    await prisma.invitation.createMany({
      data: classmates.map((s) => ({
        studentId: s.id,
        groupId,
        role: 'GROUP',
        invitedById: +session.user.id!,
        status: 'PENDING',
      })),
    })

    for (const c of classmates) {
      revalidateTag(`my-invitations-${c.user.id}`, 'max')
      revalidateTag(`classmates-${c.user.id}`, 'max')
    }
    revalidateTag(`classmates-${session.user.id}`, 'max')
    revalidateWorkspace(+session.user.id, groupId)

    return { success: true, message: 'Invitations sent.' }
  } catch {
    return { success: false, message: 'Failed to send invitations.' }
  }
}

// Leader-only: rename the group (unique per section, max 50 chars).
export async function renameGroup(groupId: number, name: string) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const cleanName = name.trim()
  if (!cleanName) return { success: false, message: 'Group name is required.' }
  if (cleanName.length > 50) {
    return { success: false, message: 'Group name must be 50 characters or fewer.' }
  }

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: {
      group: { select: { id: true, leaderStudentId: true, sectionId: true } },
    },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.id !== groupId) {
    return { success: false, message: 'Not authorized.' }
  }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can rename the group.' }
  }

  const duplicate = await prisma.group.findFirst({
    where: {
      sectionId: student.group.sectionId,
      groupName: { equals: cleanName, mode: 'insensitive' },
      deletedAt: null,
      id: { not: groupId },
    },
    select: { id: true },
  })
  if (duplicate) {
    return {
      success: false,
      message: 'A group with this name already exists in your section.',
    }
  }

  try {
    await prisma.group.update({
      where: { id: groupId },
      data: { groupName: cleanName },
    })
    revalidateWorkspace(+session.user.id, groupId)
    return { success: true, message: 'Group renamed successfully.' }
  } catch {
    return { success: false, message: 'Failed to rename group.' }
  }
}

// Leader-only: remove a member from the group.
export async function removeGroupMember(memberId: number) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can remove members.' }
  }
  if (memberId === student.id) {
    return { success: false, message: 'You cannot remove yourself.' }
  }

  const member = await prisma.student.findFirst({
    where: { id: memberId, groupId: student.group.id, deletedAt: null },
    include: { user: { select: { id: true } } },
  })
  if (!member) return { success: false, message: 'Member not found in your group.' }

  try {
    await prisma.student.update({
      where: { id: memberId },
      data: { groupId: null },
    })
    revalidateWorkspace(+session.user.id, student.group.id)
    revalidateTag(`workspace-${member.user.id}`, 'max')
    revalidateTag(`classmates-${member.user.id}`, 'max')
    revalidateTag(`my-invitations-${member.user.id}`, 'max')
    return { success: true, message: 'Member removed from the group.' }
  } catch {
    return { success: false, message: 'Failed to remove member.' }
  }
}

// Leader-only: hand leadership to another member.
export async function transferLeadership(memberId: number) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can transfer leadership.' }
  }
  if (memberId === student.id) {
    return { success: false, message: 'You are already the group leader.' }
  }

  const member = await prisma.student.findFirst({
    where: { id: memberId, groupId: student.group.id, deletedAt: null },
    include: { user: { select: { id: true } } },
  })
  if (!member) return { success: false, message: 'Member not found in your group.' }

  try {
    await prisma.group.update({
      where: { id: student.group.id },
      data: { leaderStudentId: memberId },
    })
    revalidateWorkspace(+session.user.id, student.group.id)
    revalidateTag(`workspace-${member.user.id}`, 'max')
    return { success: true, message: 'Leadership transferred successfully.' }
  } catch {
    return { success: false, message: 'Failed to transfer leadership.' }
  }
}

// Leave the group. Leaders auto-transfer to the next oldest member, or
// the group is deleted if they are the last member.
export async function leaveGroup() {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }

  const isLeader = student.group.leaderStudentId === student.id

  try {
    if (isLeader) {
      const nextLeader = await prisma.student.findFirst({
        where: { groupId: student.group.id, deletedAt: null, id: { not: student.id } },
        orderBy: { id: 'asc' },
        include: { user: { select: { id: true } } },
      })

      if (nextLeader) {
        await prisma.group.update({
          where: { id: student.group.id },
          data: { leaderStudentId: nextLeader.id },
        })
        await prisma.student.update({
          where: { id: student.id },
          data: { groupId: null },
        })
        revalidateWorkspace(+session.user.id, student.group.id)
        if (nextLeader.user?.id) {
          revalidateTag(`workspace-${nextLeader.user.id}`, 'max')
        }
        return { success: true, message: 'You left the group. Leadership transferred.' }
      } else {
        await prisma.group.update({
          where: { id: student.group.id },
          data: { deletedAt: new Date() },
        })
        await prisma.student.update({
          where: { id: student.id },
          data: { groupId: null },
        })
        revalidateWorkspace(+session.user.id, student.group.id)
        return { success: true, message: 'You left the group.' }
      }
    } else {
      await prisma.student.update({
        where: { id: student.id },
        data: { groupId: null },
      })
      const remaining = await prisma.student.count({
        where: { groupId: student.group.id, deletedAt: null },
      })
      if (remaining === 0) {
        await prisma.group.update({
          where: { id: student.group.id },
          data: { deletedAt: new Date() },
        })
      }
      revalidateWorkspace(+session.user.id, student.group.id)
      return { success: true, message: 'You left the group.' }
    }
  } catch {
    return { success: false, message: 'Failed to leave the group.' }
  }
}

// Leader-only: cancel a pending GROUP invite.
export async function cancelGroupInvitation(invitationId: number) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can cancel invitations.' }
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      groupId: student.group.id,
      role: 'GROUP',
      status: 'PENDING',
      deletedAt: null,
    },
    include: { student: { select: { userId: true } } },
  })
  if (!invitation) return { success: false, message: 'Invitation not found.' }

  try {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    })
    revalidateWorkspace(+session.user.id, student.group.id)
    if (invitation.student?.userId) {
      revalidateTag(`my-invitations-${invitation.student.userId}`, 'max')
    }
    return { success: true, message: 'Invitation cancelled.' }
  } catch {
    return { success: false, message: 'Failed to cancel invitation.' }
  }
}

// Leader-only: send (or replace) an adviser-assignment invite to a faculty
// member. A new invite replaces the previous pending one.
export async function sendAdviserInvitation(facultyId: number) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: {
      group: { select: { id: true, leaderStudentId: true, adviserId: true } },
    },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can invite an adviser.' }
  }
  if (student.group.adviserId) {
    return {
      success: false,
      message: 'Your group already has an adviser.',
    }
  }

  const faculty = await prisma.faculty.findFirst({
    where: { id: facultyId, deletedAt: null },
    include: { user: { select: { id: true } } },
  })
  if (!faculty) return { success: false, message: 'Faculty not found.' }

  try {
    await prisma.invitation.updateMany({
      where: {
        groupId: student.group.id,
        role: 'ADVISER_ASSIGNMENT',
        status: 'PENDING',
      },
      data: { status: 'CANCELLED' },
    })
    const record = await prisma.invitation.create({
      data: {
        facultyId,
        groupId: student.group.id,
        role: 'ADVISER_ASSIGNMENT',
        invitedById: +session.user.id!,
        status: 'PENDING',
      },
    })
    revalidateWorkspace(+session.user.id, student.group.id)
    revalidateTag(`my-invitations-${faculty.user.id}`, 'max')
    revalidateAdviserCaches()
    return {
      success: true,
      message: 'Adviser invitation sent.',
      payload: { invitationId: record.id },
    }
  } catch {
    return { success: false, message: 'Failed to send invitation.' }
  }
}

// Leader-only: cancel the pending adviser-assignment invite.
export async function cancelAdviserInvitation(invitationId: number) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can cancel this invitation.' }
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      groupId: student.group.id,
      role: 'ADVISER_ASSIGNMENT',
      status: 'PENDING',
      deletedAt: null,
    },
    include: { faculty: { select: { userId: true } } },
  })
  if (!invitation) return { success: false, message: 'Invitation not found.' }

  try {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    })
    revalidateWorkspace(+session.user.id, student.group.id)
    if (invitation.faculty?.userId) {
      revalidateTag(`my-invitations-${invitation.faculty.userId}`, 'max')
    }
    revalidateAdviserCaches()
    return { success: true, message: 'Adviser invitation cancelled.' }
  } catch {
    return { success: false, message: 'Failed to cancel invitation.' }
  }
}
