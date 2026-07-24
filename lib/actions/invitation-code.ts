'use server'

import prisma from '@/lib/prisma'
import { revalidateTag, revalidatePath } from 'next/cache'
import { cacheLife, cacheTag } from 'next/cache'
import { generateInvitationCode } from '@/lib/helper'
import { USERS_PER_PAGE } from '@/config/constants'
import { requireAdmin, requireUser, requireStudent } from '@/lib/actions/guard'
import { InvitationCode, InvitationType } from '@prisma/client'

const table = 'invitationCode'

// GET FACULTY INVITATION CODE — returns a valid FACULTY code.
// If the latest code is expired, soft-deletes it and creates a new one.
async function getFacultyInvitationCodeData() {
  try {
    let record = await prisma[table].findFirst({
      where: { deletedAt: null, type: 'FACULTY' as const },
      orderBy: { id: 'desc' },
    })

    if (!record || record.expiresAt < new Date()) {
      if (record) {
        const target = { id: record.id, expiresAt: record.expiresAt }
        const res = await softDeleteInvitationCode(target)
        console.log(res)
      }

      const res = await createInvitationCode('FACULTY')
      return {
        success: res?.success,
        payload: res?.payload,
        message: res?.message,
      }
    }

    return { success: true, payload: record }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to get faculty invitation code',
    }
  }
}

export async function getFacultyInvitationCode() {
  // Only Program Chair can acces this server action
  /*if (!(await requireUser())) {
    return { success: false, payload: null, message: 'Not authorized' }
  }*/
  return getFacultyInvitationCodeData()
}

// Create invitation code
async function createInvitationCode(type: InvitationType) {
  const code = generateInvitationCode()
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

  try {
    const record = await prisma[table].create({
      data: { code, type, expiresAt },
    })

    revalidateTag('invitation-codes', 'max')
    type === 'STUDENT' ? revalidatePath('/section') : revalidatePath('/faculty')

    return {
      success: true,
      message: 'Invitation code created successfully',
      payload: record,
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to create invitation code',
    }
  }
}

async function softDeleteInvitationCode({
  id,
  expiresAt,
}: {
  id: number
  expiresAt: Date
}) {
  try {
    if (!id || !expiresAt) {
      return {
        success: false,
        payload: null,
        message: 'Invitation code invalid or expired.',
      }
    }

    const deletedInvitationCode = await prisma[table].update({
      where: { id },
      data: { deletedAt: expiresAt },
    })

    revalidateTag('invitation-codes', 'max')

    return {
      success: true,
      payload: deletedInvitationCode,
      message: 'Invitation code deleted successfully.',
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to delete invitation code',
    }
  }
}
