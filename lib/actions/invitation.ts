'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { getSession } from '@/lib/actions/guard'
import { addCoordinator } from '@/lib/actions/coordinator'
import { addAdviser } from '@/lib/actions/adviser'
import { GROUP_CAP, ADVISER_INVITE_TTL_MS } from '@/types/milestones'
import type { InvitationRole } from '@prisma/client'

const table = 'invitation'

async function getPendingCoordinatorInvitationsData(role: InvitationRole) {
  try {
    const invitations = await prisma[table].findMany({
      where: { role, status: 'PENDING' },
      include: {
        faculty: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, payload: invitations }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to get invitations',
    }
  }
}

export async function getPendingCoordinatorInvitations(role: InvitationRole) {
  return getPendingCoordinatorInvitationsData(role)
}

// Invitations sent TO a specific user (invitee view — notification panel).
// Resolves the invitee by role: faculty (COORDINATOR / ADVISER /
// ADVISER_ASSIGNMENT) or student (GROUP). Pending GROUP and
// ADVISER_ASSIGNMENT invites older than the 7-day TTL flip to CANCELLED
// lazily on read.
async function getMyPendingInvitationsData(userId: number) {
  'use cache'
  cacheTag(`my-invitations-${userId}`)
  cacheLife('max')

  try {
    const cutoff = new Date(Date.now() - ADVISER_INVITE_TTL_MS)
    await prisma[table].updateMany({
      where: {
        deletedAt: null,
        status: 'PENDING',
        role: { in: ['GROUP', 'ADVISER_ASSIGNMENT'] },
        createdAt: { lt: cutoff },
        OR: [{ faculty: { userId } }, { student: { userId } }],
      },
      data: { status: 'CANCELLED' },
    })

    const invitations = await prisma[table].findMany({
      where: {
        deletedAt: null,
        status: 'PENDING',
        OR: [
          { faculty: { userId, deletedAt: null } },
          { student: { userId, deletedAt: null } },
        ],
      },
      include: {
        faculty: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        group: { select: { id: true, groupName: true } },
        invitedBy: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, payload: invitations }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to get invitations',
    }
  }
}

export async function getMyPendingInvitations(userId: number) {
  return getMyPendingInvitationsData(userId)
}

function revalidateInvitee(invitation: {
  faculty?: { userId?: number } | null
  student?: { userId?: number } | null
}) {
  const inviteeId = invitation.faculty?.userId ?? invitation.student?.userId
  if (inviteeId) {
    revalidateTag(`my-invitations-${inviteeId}`, 'max')
  }
  revalidateTag('invitations', 'max')
  revalidateTag('faculty', 'max')
}

function revalidateGroupWorkspace(groupId?: number | null, leaderUserId?: number) {
  if (groupId) revalidateTag(`journey-${groupId}`, 'max')
  if (leaderUserId) revalidateTag(`workspace-${leaderUserId}`, 'max')
  revalidateTag('sections', 'max')
  revalidateTag('my-sections', 'max')
}

// Accept — creates the role record (Coordinator/Adviser), sets the student's
// group, or assigns the adviser, then marks the invitation ACCEPTED.
export async function acceptInvitation(invitationId: number) {
  try {
    const invitation = await prisma[table].findFirst({
      where: { id: invitationId, status: 'PENDING', deletedAt: null },
      include: {
        faculty: { select: { id: true, userId: true } },
        student: { select: { id: true, userId: true } },
        group: { select: { id: true, groupName: true } },
        invitedBy: { select: { id: true } },
      },
    })
    if (!invitation) {
      return { success: false, payload: null, message: 'Invitation not found.' }
    }

    const session = await getSession()
    const inviteeUserId = invitation.faculty?.userId ?? invitation.student?.userId
    if (!session?.user?.id || +session.user.id !== inviteeUserId) {
      return {
        success: false,
        payload: null,
        message: 'You are not the invitee for this invitation.',
      }
    }

    const readAt = new Date()

    if (invitation.role === 'GROUP') {
      const groupId = invitation.groupId
      if (!groupId) {
        return { success: false, payload: null, message: 'Invitation is missing a group.' }
      }

      const student = await prisma.student.findFirst({
        where: { userId: +session.user.id, deletedAt: null },
      })
      if (!student) {
        return { success: false, payload: null, message: 'Student record not found.' }
      }
      if (student.groupId) {
        return { success: false, payload: null, message: 'You are already in a group.' }
      }

      const group = await prisma.group.findFirst({
        where: { id: groupId, deletedAt: null },
        include: { students: { where: { deletedAt: null }, select: { id: true } } },
      })
      if (!group) {
        return { success: false, payload: null, message: 'Group not found.' }
      }
      if (group.students.length >= GROUP_CAP) {
        return { success: false, payload: null, message: 'This group is already full.' }
      }

      await prisma.$transaction([
        prisma.student.update({
          where: { id: student.id },
          data: { groupId: group.id },
        }),
        // Accepting one invite auto-cancels the rest of your pending group invites.
        prisma.invitation.updateMany({
          where: {
            studentId: student.id,
            role: 'GROUP',
            status: 'PENDING',
            id: { not: invitationId },
          },
          data: { status: 'CANCELLED' },
        }),
        prisma.invitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED', readAt },
        }),
      ])

      revalidateTag(`workspace-${session.user.id}`, 'max')
      revalidateTag(`my-invitations-${session.user.id}`, 'max')
      revalidateTag(`classmates-${session.user.id}`, 'max')
      revalidateTag(`classmates-${invitation.invitedBy.id}`, 'max')
      revalidateGroupWorkspace(group.id, invitation.invitedBy.id)

      return {
        success: true,
        message: 'You joined the group.',
        payload: { readAt: readAt.toISOString() },
      }
    }

    if (invitation.role === 'ADVISER_ASSIGNMENT') {
      const facultyId = invitation.facultyId
      const groupId = invitation.groupId
      if (!facultyId || !groupId) {
        return {
          success: false,
          payload: null,
          message: 'Invitation is missing details.',
        }
      }

      const group = await prisma.group.findFirst({
        where: { id: groupId, deletedAt: null },
        select: { id: true, adviserId: true },
      })
      if (!group) {
        return { success: false, payload: null, message: 'Group not found.' }
      }
      if (group.adviserId) {
        return {
          success: false,
          payload: null,
          message: 'This group already has an adviser.',
        }
      }

      const roleResult = await addAdviser(facultyId)
      if (!roleResult.success) {
        return {
          success: false,
          payload: null,
          message: roleResult.message ?? 'Failed to create the adviser record.',
        }
      }
      const adviserId = roleResult.payload?.id
      if (!adviserId) {
        return {
          success: false,
          payload: null,
          message: 'Could not resolve the adviser record.',
        }
      }

      await prisma.$transaction([
        prisma.group.update({
          where: { id: group.id },
          data: { adviserId },
        }),
        prisma.invitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED', readAt },
        }),
      ])

      revalidateTag(`workspace-${invitation.invitedBy.id}`, 'max')
      revalidateTag(`my-invitations-${session.user.id}`, 'max')
      revalidateGroupWorkspace(group.id)
      revalidateTag('advisers', 'max')
      revalidateTag('faculty', 'max')

      return {
        success: true,
        message: 'Adviser assignment accepted.',
        payload: { readAt: readAt.toISOString() },
      }
    }

    let roleResult
    if (invitation.role === 'COORDINATOR') {
      roleResult = await addCoordinator(invitation.facultyId)
    } else if (invitation.role === 'ADVISER') {
      roleResult = await addAdviser(invitation.facultyId)
    } else {
      return {
        success: false,
        payload: null,
        message: 'Unsupported invitation role.',
      }
    }

    if (!roleResult.success) {
      return {
        success: false,
        payload: null,
        message:
          roleResult.message ?? 'Failed to create the role for this invitation.',
      }
    }

    const record = await prisma[table].update({
      where: { id: invitationId },
      data: { status: 'ACCEPTED', readAt },
    })

    revalidateInvitee(invitation)

    return {
      success: true,
      message: 'Invitation accepted successfully.',
      payload: record,
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to accept invitation.',
    }
  }
}

// Decline — marks the invitation REJECTED.
export async function declineInvitation(invitationId: number) {
  try {
    const invitation = await prisma[table].findFirst({
      where: { id: invitationId, status: 'PENDING', deletedAt: null },
      include: {
        faculty: { select: { userId: true } },
        student: { select: { userId: true } },
        group: { select: { id: true } },
        invitedBy: { select: { id: true } },
      },
    })
    if (!invitation) {
      return { success: false, payload: null, message: 'Invitation not found.' }
    }

    const session = await getSession()
    const inviteeUserId = invitation.faculty?.userId ?? invitation.student?.userId
    if (!session?.user?.id || +session.user.id !== inviteeUserId) {
      return {
        success: false,
        payload: null,
        message: 'You are not the invitee for this invitation.',
      }
    }

    const record = await prisma[table].update({
      where: { id: invitationId },
      data: { status: 'REJECTED', readAt: new Date() },
    })

    revalidateInvitee(invitation)
    if (invitation.groupId) {
      revalidateGroupWorkspace(invitation.group.id, invitation.invitedBy.id)
    }

    return {
      success: true,
      message: 'Invitation declined.',
      payload: record,
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to decline invitation.',
    }
  }
}

// Mark all pending invitations sent to the user as read (faculty or student).
export async function markAllInvitationsRead(userId: number) {
  try {
    const result = await prisma[table].updateMany({
      where: {
        deletedAt: null,
        status: 'PENDING',
        readAt: null,
        OR: [{ faculty: { userId } }, { student: { userId } }],
      },
      data: { readAt: new Date() },
    })

    revalidateTag(`my-invitations-${userId}`, 'max')

    return {
      success: true,
      message: 'All notifications marked as read.',
      payload: { count: result.count },
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to mark notifications as read.',
    }
  }
}

export async function sendInvitation(
  facultyId: number,
  role: InvitationRole,
  invitedById: number,
) {
  try {
    const existing = await prisma[table].findFirst({
      where: { facultyId, role, status: 'PENDING' },
    })
    if (existing) {
      return {
        success: false,
        message: 'This faculty already has a pending invitation for this role.',
        payload: null,
      }
    }

    const record = await prisma[table].create({
      data: {
        facultyId,
        role,
        invitedById,
        status: 'PENDING',
      },
    })

    const invitedFaculty = await prisma.faculty.findFirst({
      where: { id: facultyId },
      select: { userId: true },
    })

    revalidateInvitee({ faculty: { userId: invitedFaculty?.userId } })

    return {
      success: true,
      message: 'Invitation sent successfully.',
      payload: record,
    }
  } catch (e) {
    console.error('sendInvitation error:', e)
    return {
      success: false,
      message: 'Failed to send invitation.',
      payload: null,
    }
  }
}

export async function cancelInvitation(invitationId: number) {
  // const session = await requireAdmin()
  // if (!session) return { success: false, message: 'Not authorized' }

  try {
    const record = await prisma[table].update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    })

    const cancelledFaculty = await prisma.faculty.findFirst({
      where: { id: record.facultyId },
      select: { userId: true },
    })

    revalidateInvitee({ faculty: { userId: cancelledFaculty?.userId } })

    return { success: true, message: 'Invitation cancelled.' }
  } catch {
    return { success: false, message: 'Failed to cancel invitation.' }
  }
}
