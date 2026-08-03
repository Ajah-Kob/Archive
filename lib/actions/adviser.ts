'use server'

import prisma from '@/lib/prisma'
import { revalidateTag, revalidatePath } from 'next/cache'

const table = 'adviser'

// CREATE — called when faculty accepts the adviser invitation.
// Guards are intentionally omitted for now.
export async function addAdviser(facultyId: number) {
  try {
    const existing = await prisma[table].findFirst({
      where: { facultyId, deletedAt: null },
    })
    if (existing) {
      return {
        success: false,
        payload: null,
        message: 'This faculty member is already an adviser.',
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
    revalidatePath('/faculty')

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
