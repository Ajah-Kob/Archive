'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { revalidateFeature } from '@/lib/actions/revalidate'

const table = 'adviser'

// CREATE — called when faculty accepts the adviser invitation.
// Idempotent: if the faculty already holds a live adviser record, returns it
// instead of failing (both the role-grant and the assignment-accept paths rely
// on this).
export async function addAdviser(facultyId: number) {
  try {
    const existing = await prisma[table].findFirst({
      where: { facultyId, deletedAt: null },
      include: {
        faculty: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    })
    if (existing) {
      revalidateTag('advisers', 'max')
      revalidateTag('faculty', 'max')
      return {
        success: true,
        payload: existing,
        message: 'Faculty is already an adviser.',
      }
    }

    // A previous removal soft-deletes the row, which still occupies the
    // unique facultyId slot. Re-inviting revives the existing record instead
    // of creating a new one.
    const record = await prisma[table].upsert({
      where: { facultyId },
      create: { facultyId },
      update: { deletedAt: null },
      include: {
        faculty: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    })

    revalidateTag('advisers', 'max')
    revalidateFeature('faculty-list')

    return {
      success: true,
      message: 'Adviser created successfully',
      payload: record,
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to create adviser',
    }
  }
}
