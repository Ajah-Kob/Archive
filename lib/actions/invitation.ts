'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { requireAdmin, requireUser } from '@/lib/actions/guard'
import { addCoordinator } from '@/lib/actions/coordinator'
import { addAdviser } from '@/lib/actions/adviser'
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
async function getMyPendingInvitationsData(userId: number) {
  'use cache'
  cacheTag(`my-invitations-${userId}`)
  cacheLife('max')

  try {
    const invitations = await prisma[table].findMany({
      where: {
        deletedAt: null,
        status: 'PENDING',
        faculty: { userId, deletedAt: null },
      },
      include: {
        faculty: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
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

function revalidateInvitee(invitation: { faculty?: { userId?: number } | null }) {
  if (invitation.faculty?.userId) {
    revalidateTag(`my-invitations-${invitation.faculty.userId}`, 'max')
  }
  revalidateTag('invitations', 'max')
  revalidateTag('faculty', 'max')
}

// Accept — creates the role record (Coordinator/Adviser) and marks the
// invitation ACCEPTED. Guards are intentionally omitted for now.
export async function acceptInvitation(invitationId: number) {
  try {
    const invitation = await prisma[table].findFirst({
      where: { id: invitationId, status: 'PENDING' },
      include: { faculty: { select: { userId: true } } },
    })
    if (!invitation) {
      return { success: false, payload: null, message: 'Invitation not found.' }
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
      data: { status: 'ACCEPTED', readAt: new Date() },
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

// Decline — marks the invitation REJECTED. Guards omitted for now.
export async function declineInvitation(invitationId: number) {
  try {
    const invitation = await prisma[table].findFirst({
      where: { id: invitationId, status: 'PENDING' },
      include: { faculty: { select: { userId: true } } },
    })
    if (!invitation) {
      return { success: false, payload: null, message: 'Invitation not found.' }
    }

    const record = await prisma[table].update({
      where: { id: invitationId },
      data: { status: 'REJECTED', readAt: new Date() },
    })

    revalidateInvitee(invitation)

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

// Mark all pending invitations sent to the user as read.
export async function markAllInvitationsRead(userId: number) {
  try {
    const result = await prisma[table].updateMany({
      where: {
        deletedAt: null,
        status: 'PENDING',
        faculty: { userId },
        readAt: null,
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
