'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/actions/guard'
import { validateFacultyCode } from '@/lib/actions/invitation-code'

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

  return { success: true, message: 'Faculty registration successful.' }
}
