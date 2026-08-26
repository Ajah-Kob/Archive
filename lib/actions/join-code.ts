'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { cacheLife, cacheTag } from 'next/cache'
import { revalidateFeature } from '@/lib/actions/revalidate'
import { generateJoinCode } from '@/lib/helper'
import { USERS_PER_PAGE } from '@/config/constants'
import { JoinCode, JoinType } from '@prisma/client'

const table = 'joinCode'

async function getFacultyJoinCodeData() {
  try {
    const record = await prisma[table].findFirst({
      where: { deletedAt: null, type: 'FACULTY' as const },
      orderBy: { id: 'desc' },
    })

    if (!record || record.expiresAt < new Date()) {
      return {
        success: false,
        payload: null,
        message: 'No valid faculty invitation code found',
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

export async function copyFacultyJoinCode() {
  // Only Program Chair can acces this server action
  /*if (!(await requireUser())) {
    return { success: false, payload: null, message: 'Not authorized' }
  }*/

  const res = await getFacultyJoinCodeData()
  if (res.success && res.payload) {
    return {
      success: true,
      message: 'Invitation code found',
      payload: res.payload,
    }
  }

  // No valid code exists — soft-delete old one (if any expired) and create new
  const expired = await prisma[table].findFirst({
    where: { deletedAt: null, type: 'FACULTY' as const },
    orderBy: { id: 'desc' },
  })

  if (expired) {
    await softDeleteJoinCode(expired)
  }

  const created = await createJoinCode('FACULTY')
  return created
}

async function createJoinCode(type: JoinType) {
  const code = generateJoinCode()
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

  try {
    const record = await prisma[table].create({
      data: { code, type, expiresAt },
    })

    revalidateTag('join-code', 'max')
    if (type === 'STUDENT') revalidateFeature('sections')
    else revalidateFeature('faculties')

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

async function softDeleteJoinCode(code: JoinCode) {
  try {
    const { id, expiresAt } = code
    const deleted = await prisma[table].update({
      where: { id, expiresAt },
      data: { deletedAt: expiresAt },
    })

    revalidateTag('join-codes', 'max')

    return {
      success: true,
      payload: deleted,
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

export async function validateFacultyCode(code: string) {
  const record = await prisma[table].findFirst({
    where: {
      code,
      type: 'FACULTY',
      deletedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
  return {
    success: !!record,
    message: record ? 'Valid' : 'Invalid or expired code',
  }
}
