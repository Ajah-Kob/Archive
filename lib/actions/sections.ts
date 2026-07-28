'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import type { SectionData } from '@/components/coordinator/main/SectionDataRow'
import { getInitials } from '@/lib/helper'

const gradients = [
  'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
  'linear-gradient(135deg, #fe6f6f 0%, #e85555 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #e08800 100%)',
  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)',
]

const table = 'section'

function getGradient(id: number) {
  return gradients[id % gradients.length]
}

async function getSectionsData() {
  'use cache'
  cacheTag('sections')
  cacheLife('max')

  const sections = await prisma[table].findMany({
    where: { deletedAt: null },
    include: {
      coordinator: {
        include: {
          faculty: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
      students: {
        where: { deletedAt: null },
        select: { id: true, groupId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const payload: SectionData[] = sections.map((s) => ({
    id: s.id,
    coordinator: {
      initials: getInitials(s.coordinator.faculty.user.name),
      name: s.coordinator.faculty.user.name,
      email: s.coordinator.faculty.user.email,
      avatarGradient: getGradient(s.id),
    },
    section: s.section,
    dateCreated: s.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    students: s.students.length,
    groups: new Set(
      s.students.filter((st) => st.groupId).map((st) => st.groupId),
    ).size,
  }))

  return payload
}

export async function getSections() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
  }

  try {
    const payload = await getSectionsData()
    return { success: true, payload }
  } catch (error) {
    console.error('[getSections | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch sections',
      payload: null,
    }
  }
}
