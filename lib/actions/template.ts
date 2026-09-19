'use server'

import { revalidateTag } from 'next/cache'
import { put } from '@vercel/blob'
import prisma from '@/lib/prisma'
import { requireUser, unauthorized } from '@/lib/actions/guard'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE_BYTES = 10 * 1024 * 1024

export async function getTemplates(search?: string) {
  const session = await requireUser()
  if (!session) {
    return []
  }
  // BSIS-only: guests have not joined a section/faculty yet — no templates.
  if ((session.user.role as string) === 'GUEST') {
    return []
  }

  try {
    const where: Record<string, unknown> = { deletedAt: null }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const templates = await prisma.template.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { name: true, email: true } },
      },
    })

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      dateUploaded: t.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      rawCreatedAt: t.createdAt.toISOString(),
      uploadedBy: t.uploadedBy.name,
      uploadedByEmail: t.uploadedBy.email,
      // Below 1 MB show KB; 1 MB and above show MB.
      size:
        t.size < 1024 * 1024
          ? `${Math.round(t.size / 1024)} KB`
          : `${(t.size / (1024 * 1024)).toFixed(1)} MB`,
      rawSize: t.size,
      fileUrl: t.blobUrl,
    }))
  } catch (error) {
    console.error('getTemplates error:', error)
    throw error
  }
}

export async function uploadTemplate(formData: FormData) {
  const session = await requireUser()
  if (!session) {
    return { success: false, payload: null, message: 'Not authorized.' }
  }
  if ((session.user.role as string) === 'GUEST') {
    return { success: false, payload: null, message: 'Not authorized.' }
  }

  const file = formData.get('file') as File

  if (!file || file.size === 0) {
    return { success: false, payload: null, message: 'No file provided.' }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      payload: null,
      message: 'Unsupported file type. Only PDF, DOC, DOCX allowed.',
    }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return {
      success: false,
      payload: null,
      message: 'File too large (max 10MB).',
    }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const blob = await put(`templates/${file.name}`, buffer, {
      access: 'private',
      contentType: file.type,
      addRandomSuffix: true,
    })

    const template = await prisma.template.create({
      data: {
        name: file.name,
        fileName: file.name,
        blobUrl: blob.url,
        mimeType: file.type,
        size: file.size,
        uploadedById: +session.user.id,
      },
    })

    revalidateTag('templates', 'max')

    return {
      success: true,
      payload: {
        id: template.id,
        url: blob.url,
        size: file.size,
        name: file.name,
      },
      message: 'Template uploaded successfully.',
    }
  } catch (error) {
    console.error('Error in uploadTemplate:', error)
    return { success: false, payload: null, message: 'Upload failed.' }
  }
}

export async function deleteTemplate(id: number) {
  const session = await requireUser()
  if (!session) {
    return { success: false, message: 'Not authorized.' }
  }
  if ((session.user.role as string) === 'GUEST') {
    return { success: false, message: 'Not authorized.' }
  }

  try {
    const template = await prisma.template.findFirst({
      where: { id, deletedAt: null },
    })

    if (!template) {
      return { success: false, message: 'Template not found.' }
    }

    if (+session.user.id !== template.uploadedById) {
      return { success: false, message: 'You can only remove documents you have uploaded.' }
    }

    await prisma.template.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    revalidateTag('templates', 'max')
    return { success: true, message: 'Template deleted.' }
  } catch (error) {
    console.error('Error in deleteTemplate:', error)
    return { success: false, message: 'Error deleting template.' }
  }
}
