'use server'

import prisma from '@/lib/prisma'
import { cacheTag, cacheLife } from 'next/cache'
import type { AuthorEntry } from '@/lib/archiving/validation'

export interface RepositoryArchiveRow {
  id: number
  groupId: number
  title: string
  abstract: string | null
  tags: string[]
  authorOrder: AuthorEntry[]
  blobUrl: string
  fileName: string
  mimeType: string
  size: number
  datePublished: string
  uploadedById: number
}

// Internal cached reader — 'use cache' persistent, tag-based for instant invalidation on approve.
// Never rejects: a throw across the 'use cache' boundary fails the /repository
// prerender (and the whole Vercel build) even when the caller handles failure,
// e.g. when the connected database is missing tables. Persist null instead so
// callers degrade to empty/error UI.
async function getArchivedCapstonesData(): Promise<RepositoryArchiveRow[] | null> {
  'use cache'
  cacheTag('archives')
  cacheTag('repository')
  cacheLife('max')

  try {
    const rows = await prisma.capstoneArchive.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        groupId: true,
        title: true,
        abstract: true,
        tags: true,
        authorOrder: true,
        blobUrl: true,
        fileName: true,
        mimeType: true,
        size: true,
        datePublished: true,
        uploadedById: true,
      },
      orderBy: { datePublished: 'desc' },
    })

    return rows.map((r) => ({
      id: r.id,
      groupId: r.groupId,
      title: r.title,
      abstract: r.abstract,
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      authorOrder: Array.isArray(r.authorOrder) ? (r.authorOrder as unknown as AuthorEntry[]) : [],
      blobUrl: r.blobUrl,
      fileName: r.fileName,
      mimeType: r.mimeType,
      size: r.size,
      datePublished: (r.datePublished as Date).toISOString(),
      uploadedById: r.uploadedById,
    }))
  } catch (error) {
    console.error('[getArchivedCapstonesData | Error]:', error)
    return null
  }
}

/**
 * Public reader for /repository — returns ARCHIVED capstones ordered by datePublished desc.
 * Uses 'use cache' + cacheTag('archives') so approveArchiving's revalidateTag makes Repository show immediately.
 * No auth guard — repository is shared by any role per proxy (no protection).
 */
export async function getRepositoryArchives(): Promise<{
  success: boolean
  message: string
  payload: RepositoryArchiveRow[] | null
}> {
  const payload = await getArchivedCapstonesData()
  if (!payload) {
    return { success: false, message: 'Failed to fetch repository archives.', payload: null }
  }
  return { success: true, message: '', payload }
}

/**
 * Alias for acceptance-criteria naming — also covers tag 'repository'.
 */
export async function getArchivedCapstones(): Promise<{
  success: boolean
  message: string
  payload: RepositoryArchiveRow[] | null
}> {
  return getRepositoryArchives()
}
