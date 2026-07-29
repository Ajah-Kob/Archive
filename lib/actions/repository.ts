'use server'

import {
  unstable_cacheTag as cacheTag,
  unstable_cacheLife as cacheLife,
} from 'next/cache'
import { revalidateTag } from 'next/cache'
import { put, del } from '@vercel/blob'
import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/actions/guard'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE_BYTES = 10 * 1024 * 1024

const table = 'capstoneArchive'

export async function getArchives(page = 1, perPage = 10) {
  'use cache'
  cacheTag('archives')
  cacheLife('max')

  const skip = (page - 1) * perPage

  const [archives, total] = await Promise.all([
    prisma[table].findMany({
      where: { deletedAt: null },
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        group: {
          include: {
            students: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    prisma[table].count({ where: { deletedAt: null } }),
  ])

  return { archives, totalPages: Math.ceil(total / perPage) }
}

export async function getArchive(id: number) {
  'use cache'
  cacheTag(`archive-${id}`)
  cacheLife('max')

  return prisma[table].findFirst({
    where: { id, deletedAt: null },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      group: {
        include: {
          students: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
  })
}

export async function publishArchive(_prevState: unknown, formData: FormData) {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Not authorized.' }
  }

  const groupId = parseInt(formData.get('groupId')?.toString() || '', 10)
  const title = formData.get('title')?.toString().trim()
  const abstract = formData.get('abstract')?.toString().trim() || null
  const category = formData.get('category')?.toString().trim()
  const file = formData.get('file') as File | null

  if (!groupId || !title || !category || !file || file.size === 0) {
    return { success: false, message: 'Missing required fields.' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      message: 'Unsupported file type. Only PDF, DOC, DOCX allowed.',
    }
  }

  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, message: 'File too large (max 10MB).' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const blob = await put(`archives/${groupId}/${file.name}`, buffer, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: true,
    })

    await prisma[table].create({
      data: {
        groupId,
        title,
        abstract,
        datePublished: new Date(),
        category,
        fileName: file.name,
        blobUrl: blob.url,
        mimeType: file.type,
        size: file.size,
        uploadedById: +session.user.id,
      },
    })

    revalidateTag('archives', 'max')
    return { success: true, message: 'Archive published successfully.' }
  } catch (error) {
    console.error('Error in publishArchive:', error)
    return { success: false, message: 'Failed to publish archive.' }
  }
}

export async function deleteArchive(id: number) {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Not authorized.' }
  }

  try {
    const archive = await prisma[table].findFirst({
      where: { id, deletedAt: null },
    })

    if (!archive) {
      return { success: false, message: 'Archive not found.' }
    }

    await del(archive.blobUrl)

    await prisma[table].update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    revalidateTag('archives', 'max')
    revalidateTag(`archive-${id}`, 'max')
    return { success: true, message: 'Archive deleted.' }
  } catch (error) {
    console.error('Error in deleteArchive:', error)
    return { success: false, message: 'Failed to delete archive.' }
  }
}

export async function toggleFavorite(id: number) {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Not authorized.' }
  }

  try {
    const archive = await prisma[table].findFirst({
      where: { id, deletedAt: null },
      select: { favorited: true },
    })

    if (!archive) {
      return { success: false, message: 'Archive not found.' }
    }

    await prisma[table].update({
      where: { id },
      data: { favorited: !archive.favorited },
    })

    revalidateTag('archives', 'max')
    revalidateTag(`archive-${id}`, 'max')
    return {
      success: true,
      message: archive.favorited
        ? 'Removed from favorites.'
        : 'Added to favorites.',
    }
  } catch (error) {
    console.error('Error in toggleFavorite:', error)
    return { success: false, message: 'Failed to update favorite.' }
  }
}
