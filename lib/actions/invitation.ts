'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { requireAdmin, requireUser } from '@/lib/actions/guard'

const table = 'invitation'

async function getInvitationsData(role: string) {
  'use cache'
  cacheTag('invitations')
  cacheLife('max')

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

export async function getInvitations(role: string) {
  return getInvitationsData(role)
}

export async function sendInvitation(facultyId: number, role: string) {
  // const session = await requireAdmin()
  // if (!session) return { success: false, message: 'Not authorized' }

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
        invitedById: 1,
        status: 'PENDING',
      },
    })

    revalidateTag('invitations', 'max')
    revalidateTag('faculty', 'max')

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
    await prisma[table].update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    })

    revalidateTag('invitations', 'max')
    revalidateTag('faculty', 'max')

    return { success: true, message: 'Invitation cancelled.' }
  } catch {
    return { success: false, message: 'Failed to cancel invitation.' }
  }
}
