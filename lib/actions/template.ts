'use server'

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

export async function getTemplates(search?: string) {
  try {
    const where: Record<string, unknown> = { deletedAt: null }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const templates = await prisma.template.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { name: true } },
      },
    })

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      dateUploaded: t.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      uploadedBy: t.uploadedBy.name,
      size: `${(t.size / (1024 * 1024)).toFixed(1)} MB`,
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

  const file = formData.get('file') as File
  const category = (formData.get('category')?.toString().trim() || 'TEMPLATES') as 'TEMPLATES' | 'GUIDES' | 'FORMS'

  if (!file || file.size === 0) {
    return { success: false, payload: null, message: 'No file provided.' }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, payload: null, message: 'Unsupported file type. Only PDF, DOC, DOCX allowed.' }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, payload: null, message: 'File too large (max 10MB).' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const blob = await put(`templates/${file.name}`, buffer, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: true,
    })

    const template = await (prisma[table] as any).create({
      data: {
        name: file.name,
        category,
        fileName: file.name,
        blobUrl: blob.url,
        mimeType: file.type,
        size: file.size,
        uploadedById: +session.user.id,
      },
    })

    revalidateTag('templates')

    return {
      success: true,
      payload: { id: template.id, url: blob.url, size: file.size, name: file.name },
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

  try {
    const template = await (prisma[table] as any).findFirst({
      where: { id, deletedAt: null },
    })

    if (!template) {
      return { success: false, message: 'Template not found.' }
    }

    await del(template.blobUrl)

    await (prisma[table] as any).update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    revalidateTag('templates')
    return { success: true, message: 'Template deleted.' }
  } catch (error) {
    console.error('Error in deleteTemplate:', error)
    return { success: false, message: 'Error deleting template.' }
  }
}
