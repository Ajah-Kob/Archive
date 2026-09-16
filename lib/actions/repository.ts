'use server'

import prisma from '@/lib/prisma'
import { cacheTag, cacheLife, revalidateTag } from 'next/cache'
import { put, del } from '@vercel/blob'
import { requireAdmin, unauthorized } from '@/lib/actions/guard'
import { revalidateFeature } from '@/lib/actions/revalidate'
import {
  isValidTitle,
  isValidAbstract,
  isValidTags,
  isValidAuthors,
  isPdfMime,
  isValidEmailFormat,
  countWords,
  countChars,
  countSentences,
  TITLE_MAX_WORDS,
  TITLE_MAX_CHARS,
  ABSTRACT_MAX_SENTENCES,
  ABSTRACT_MAX_CHARS,
  PDF_MIME,
  type AuthorEntry,
} from '@/lib/archiving/validation'

export interface RepositoryArchiveRow {
  id: number
  // Nullable: standalone (admin-published) archives have no group.
  groupId: number | null
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

// ───────────────────────── admin mutations ─────────────────────────
// Admin-safe variants: uploadArchivingDocument in lib/actions/archiving.ts is
// requireStudent-guarded and group-scoped (Blob path archiving/${groupId}/),
// so admins (no student group) cannot use it. These actions inline the Blob
// put/del instead, following the lib/actions/media.ts + template.ts pattern.

function sanitizeBlobFilename(fileName: string): string {
  const cleaned = fileName.replace(/[^\w.\- ]+/g, '_').trim()
  return cleaned.length > 0 ? cleaned : 'document.pdf'
}

function revalidateRepository() {
  revalidateTag('archives', 'max')
  revalidateTag('repository', 'max')
  revalidateFeature('archives')
}

// Parses publish FormData into a typed payload. Accepts either a direct File
// upload (file/document/blob → uploaded inline, template.ts precedent) or
// pre-uploaded blob fields (blobUrl/fileName/mimeType/size). Returns empty
// defaults on missing input so validation can surface the correct message.
function parsePublishArchiveForm(formData: FormData): {
  title: string
  abstract: string
  tags: string[]
  authorOrder: AuthorEntry[]
  datePublishedRaw: string | null
  file: File | null
  blobUrl: string | null
  fileName: string | null
  mimeType: string | null
  size: number | null
} {
  const title = (formData.get('title')?.toString() ?? '').trim()
  const abstract = (formData.get('abstract')?.toString() ?? '').trim()

  const tagsRaw =
    formData.get('tags')?.toString() ??
    formData.get('tagsJson')?.toString() ??
    formData.get('tag')?.toString() ??
    ''
  let tags: string[] = []
  if (tagsRaw) {
    try {
      const parsed = JSON.parse(tagsRaw)
      if (Array.isArray(parsed)) {
        tags = parsed.map((v) => String(v))
      } else if (typeof parsed === 'string') {
        tags = [parsed]
      }
    } catch {
      if (tagsRaw.trim().length > 0) {
        tags = tagsRaw
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
        if (tags.length === 0) tags = [tagsRaw.trim()]
      }
    }
  }

  const authorsRaw =
    formData.get('authorOrder')?.toString() ??
    formData.get('authors')?.toString() ??
    formData.get('authorOrderJson')?.toString() ??
    ''
  let authorOrder: AuthorEntry[] = []
  if (authorsRaw) {
    try {
      const parsed = JSON.parse(authorsRaw)
      if (Array.isArray(parsed)) {
        authorOrder = parsed as AuthorEntry[]
      }
    } catch {
      authorOrder = []
    }
  }

  const datePublishedRaw =
    formData.get('datePublished')?.toString().trim() ||
    formData.get('publishedAt')?.toString().trim() ||
    formData.get('publishDate')?.toString().trim() ||
    null

  const maybeFile =
    (formData.get('file') as File | null) ??
    (formData.get('document') as File | null) ??
    (formData.get('blob') as File | null) ??
    null
  const file =
    maybeFile && maybeFile instanceof File && maybeFile.size > 0 ? maybeFile : null

  const blobUrl =
    formData.get('blobUrl')?.toString().trim() ||
    formData.get('blob_url')?.toString().trim() ||
    null
  const fileName = formData.get('fileName')?.toString().trim() || null
  const mimeType =
    formData.get('mimeType')?.toString().trim() ||
    formData.get('mime')?.toString().trim() ||
    null
  const sizeRaw = formData.get('size')?.toString().trim() || null
  let size: number | null = null
  if (sizeRaw) {
    const n = parseInt(sizeRaw, 10)
    if (Number.isFinite(n) && n >= 0) size = n
  }

  return { title, abstract, tags, authorOrder, datePublishedRaw, file, blobUrl, fileName, mimeType, size }
}

// Server-side validation mirroring the student submit path in
// lib/actions/archiving.ts (validateArchivingPayload with requireBlob).
// Returns { valid: true } or { valid: false, message: reason }.
function validatePublishArchivePayload(
  data: ReturnType<typeof parsePublishArchiveForm>,
): { valid: true } | { valid: false; message: string } {
  const { title, abstract, tags, authorOrder, file, blobUrl, fileName, mimeType, size } = data

  if (!title || title.trim().length === 0) {
    return { valid: false, message: 'Research title is required.' }
  }
  if (countChars(title) > TITLE_MAX_CHARS) {
    return {
      valid: false,
      message: `Research title must be at most ${TITLE_MAX_CHARS} characters (current: ${countChars(title)}).`,
    }
  }
  if (countWords(title) > TITLE_MAX_WORDS) {
    return {
      valid: false,
      message: `Research title must be at most ${TITLE_MAX_WORDS} words (current: ${countWords(title)}).`,
    }
  }
  if (!isValidTitle(title)) {
    return { valid: false, message: 'Research title is invalid.' }
  }

  if (!abstract || abstract.trim().length === 0) {
    return { valid: false, message: 'Abstract is required.' }
  }
  if (countChars(abstract) > ABSTRACT_MAX_CHARS) {
    return {
      valid: false,
      message: `Abstract must be at most ${ABSTRACT_MAX_CHARS} characters (current: ${countChars(abstract)}).`,
    }
  }
  if (countSentences(abstract) > ABSTRACT_MAX_SENTENCES) {
    return {
      valid: false,
      message: `Abstract must be at most ${ABSTRACT_MAX_SENTENCES} sentences (current: ${countSentences(abstract)}).`,
    }
  }
  if (!isValidAbstract(abstract)) {
    return { valid: false, message: 'Abstract is invalid.' }
  }

  if (!isValidTags(tags)) {
    if (!Array.isArray(tags) || tags.length < 1) {
      return { valid: false, message: 'At least one tag is required.' }
    }
    const hasEmpty = tags.some((t) => !t || t.trim().length === 0)
    if (hasEmpty) return { valid: false, message: 'Tags cannot be empty.' }
    const normalized = tags.map((t) => t.trim().toLowerCase())
    const dup = new Set(normalized).size !== normalized.length
    if (dup) return { valid: false, message: 'Duplicate tags are not allowed.' }
    return { valid: false, message: 'Tags are invalid.' }
  }

  if (!isValidAuthors(authorOrder)) {
    if (!Array.isArray(authorOrder) || authorOrder.length < 1) {
      return { valid: false, message: 'At least one author is required.' }
    }
    const hasMissing = authorOrder.some(
      (a) => !a.lastName?.trim() || !a.firstName?.trim() || !a.email?.trim(),
    )
    if (hasMissing) {
      return { valid: false, message: 'Each author requires last name, first name, and email.' }
    }
    const hasBadEmail = authorOrder.some((a) => !isValidEmailFormat(a.email))
    if (hasBadEmail) {
      return { valid: false, message: 'One or more authors have an invalid email.' }
    }
    const emails = authorOrder.map((a) => a.email.trim().toLowerCase())
    if (new Set(emails).size !== emails.length) {
      return { valid: false, message: 'Duplicate authors are not allowed.' }
    }
    const names = authorOrder.map((a) => `${a.firstName.trim().toLowerCase()}|${a.lastName.trim().toLowerCase()}`)
    if (new Set(names).size !== names.length) {
      return { valid: false, message: 'Duplicate authors are not allowed.' }
    }
    return { valid: false, message: 'Authors are invalid.' }
  }

  // Document: either a direct File upload or pre-uploaded blob fields.
  if (file) {
    const mime = (file.type ?? '').trim()
    const isPdf =
      isPdfMime(mime) || (mime === '' && file.name.toLowerCase().endsWith('.pdf'))
    if (!isPdf) {
      return { valid: false, message: 'Only PDF files are allowed.' }
    }
  } else {
    if (!blobUrl || blobUrl.trim().length === 0) {
      return { valid: false, message: 'Final document is required.' }
    }
    if (!fileName || fileName.trim().length === 0) {
      return { valid: false, message: 'Final document is required.' }
    }
    if (!mimeType || !isPdfMime(mimeType)) {
      return { valid: false, message: 'Only PDF files are allowed.' }
    }
    if (size == null) {
      return { valid: false, message: 'Final document is required.' }
    }
  }

  return { valid: true }
}

// Resolves the editable publish date (modal defaults to today). Empty input
// means now; a non-empty but unparseable value is invalid, not silently now.
function resolvePublishDate(
  raw: string | null,
): { ok: true; date: Date } | { ok: false } {
  if (!raw || raw.trim().length === 0) return { ok: true, date: new Date() }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return { ok: false }
  return { ok: true, date }
}

/**
 * Publish a standalone archive to the Repository (admin-only).
 * Validates title/abstract/tags/authors/PDF via lib/archiving/validation.ts,
 * uploads the PDF to Blob (admin-safe inline put — uploadArchivingDocument is
 * student/group-scoped), creates a CapstoneArchive row with groupId: null,
 * and revalidates the archives/repository tags. Never throws.
 */
export async function publishArchive(_prevState: any, formData: FormData) {
  const session = await requireAdmin()
  if (!session?.user?.id) return unauthorized

  try {
    const data = parsePublishArchiveForm(formData)

    const validation = validatePublishArchivePayload(data)
    if (validation.valid === false) {
      return { success: false, message: validation.message }
    }

    const publishDate = resolvePublishDate(data.datePublishedRaw)
    if (!publishDate.ok) {
      return { success: false, message: 'Invalid publish date.' }
    }

    let blobUrl: string
    let fileName: string
    let mimeType: string
    let size: number

    if (data.file) {
      const safeName = sanitizeBlobFilename(data.file.name)
      const arrayBuffer = await data.file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const blob = await put(`archives/${safeName}`, buffer, {
        access: 'public',
        contentType: data.file.type || PDF_MIME,
        addRandomSuffix: true,
      })

      blobUrl = blob.url
      fileName = data.file.name
      mimeType = data.file.type || PDF_MIME
      size = data.file.size
    } else {
      blobUrl = data.blobUrl as string
      fileName = data.fileName as string
      mimeType = data.mimeType as string
      size = data.size as number
    }

    const archive = await prisma.capstoneArchive.create({
      data: {
        groupId: null,
        title: data.title,
        abstract: data.abstract,
        tags: data.tags as unknown as object,
        authorOrder: data.authorOrder as unknown as object,
        fileName,
        blobUrl,
        mimeType,
        size,
        uploadedById: +session.user.id,
        datePublished: publishDate.date,
      },
    })

    revalidateRepository()

    return {
      success: true,
      message: 'Archive published to Repository.',
      payload: {
        id: archive.id,
        groupId: null,
        title: archive.title,
        blobUrl: archive.blobUrl,
        fileName: archive.fileName,
        datePublished: archive.datePublished.toISOString(),
      },
    }
  } catch (error) {
    console.error('[publishArchive | Error]:', error)
    return { success: false, message: 'Failed to publish archive. Please try again.' }
  }
}

/**
 * Update an existing archive in the Repository (admin-only).
 * Validates title/abstract/tags/authors via lib/archiving/validation.ts
 * (same messages as publishArchive), accepts an optional PDF replacement
 * via FormData (new File swaps the Blob and deletes the old file best-effort;
 * no new file keeps the existing blob), and applies the editable publish date.
 * Standalone rows have groupId null — groupId is never touched here.
 * Never throws.
 */
export async function updateArchive(id: number, formData: FormData) {
  const session = await requireAdmin()
  if (!session?.user?.id) return unauthorized

  if (!Number.isInteger(id)) {
    return { success: false, message: 'Invalid archive.' }
  }

  try {
    const existing = await prisma.capstoneArchive.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) {
      return { success: false, message: 'Archive not found.' }
    }

    const data = parsePublishArchiveForm(formData)

    // Same field validators as publishArchive (title/abstract/tags/authors),
    // except the document is optional: a new File must be a PDF; no new File
    // keeps the existing blob.
    const { title, abstract, tags, authorOrder, file } = data

    if (!title || title.trim().length === 0) {
      return { success: false, message: 'Research title is required.' }
    }
    if (countChars(title) > TITLE_MAX_CHARS) {
      return {
        success: false,
        message: `Research title must be at most ${TITLE_MAX_CHARS} characters (current: ${countChars(title)}).`,
      }
    }
    if (countWords(title) > TITLE_MAX_WORDS) {
      return {
        success: false,
        message: `Research title must be at most ${TITLE_MAX_WORDS} words (current: ${countWords(title)}).`,
      }
    }
    if (!isValidTitle(title)) {
      return { success: false, message: 'Research title is invalid.' }
    }

    if (!abstract || abstract.trim().length === 0) {
      return { success: false, message: 'Abstract is required.' }
    }
    if (countChars(abstract) > ABSTRACT_MAX_CHARS) {
      return {
        success: false,
        message: `Abstract must be at most ${ABSTRACT_MAX_CHARS} characters (current: ${countChars(abstract)}).`,
      }
    }
    if (countSentences(abstract) > ABSTRACT_MAX_SENTENCES) {
      return {
        success: false,
        message: `Abstract must be at most ${ABSTRACT_MAX_SENTENCES} sentences (current: ${countSentences(abstract)}).`,
      }
    }
    if (!isValidAbstract(abstract)) {
      return { success: false, message: 'Abstract is invalid.' }
    }

    if (!isValidTags(tags)) {
      if (!Array.isArray(tags) || tags.length < 1) {
        return { success: false, message: 'At least one tag is required.' }
      }
      const hasEmpty = tags.some((t) => !t || t.trim().length === 0)
      if (hasEmpty) return { success: false, message: 'Tags cannot be empty.' }
      const normalized = tags.map((t) => t.trim().toLowerCase())
      const dup = new Set(normalized).size !== normalized.length
      if (dup) return { success: false, message: 'Duplicate tags are not allowed.' }
      return { success: false, message: 'Tags are invalid.' }
    }

    if (!isValidAuthors(authorOrder)) {
      if (!Array.isArray(authorOrder) || authorOrder.length < 1) {
        return { success: false, message: 'At least one author is required.' }
      }
      const hasMissing = authorOrder.some(
        (a) => !a.lastName?.trim() || !a.firstName?.trim() || !a.email?.trim(),
      )
      if (hasMissing) {
        return { success: false, message: 'Each author requires last name, first name, and email.' }
      }
      const hasBadEmail = authorOrder.some((a) => !isValidEmailFormat(a.email))
      if (hasBadEmail) {
        return { success: false, message: 'One or more authors have an invalid email.' }
      }
      const emails = authorOrder.map((a) => a.email.trim().toLowerCase())
      if (new Set(emails).size !== emails.length) {
        return { success: false, message: 'Duplicate authors are not allowed.' }
      }
      const names = authorOrder.map((a) => `${a.firstName.trim().toLowerCase()}|${a.lastName.trim().toLowerCase()}`)
      if (new Set(names).size !== names.length) {
        return { success: false, message: 'Duplicate authors are not allowed.' }
      }
      return { success: false, message: 'Authors are invalid.' }
    }

    if (file) {
      const mime = (file.type ?? '').trim()
      const isPdf =
        isPdfMime(mime) || (mime === '' && file.name.toLowerCase().endsWith('.pdf'))
      if (!isPdf) {
        return { success: false, message: 'Only PDF files are allowed.' }
      }
    } else if (!existing.blobUrl) {
      return { success: false, message: 'Final document is required.' }
    }

    const publishDate = resolvePublishDate(data.datePublishedRaw)
    if (!publishDate.ok) {
      return { success: false, message: 'Invalid publish date.' }
    }

    let blobUrl = existing.blobUrl
    let fileName = existing.fileName
    let mimeType = existing.mimeType
    let size = existing.size
    let newBlobUrl: string | null = null

    if (data.file) {
      const safeName = sanitizeBlobFilename(data.file.name)
      const arrayBuffer = await data.file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const blob = await put(`archives/${safeName}`, buffer, {
        access: 'public',
        contentType: data.file.type || PDF_MIME,
        addRandomSuffix: true,
      })

      newBlobUrl = blob.url
      blobUrl = blob.url
      fileName = data.file.name
      mimeType = data.file.type || PDF_MIME
      size = data.file.size
    }

    try {
      const archive = await prisma.capstoneArchive.update({
        where: { id },
        data: {
          title: data.title,
          abstract: data.abstract,
          tags: data.tags as unknown as object,
          authorOrder: data.authorOrder as unknown as object,
          fileName,
          blobUrl,
          mimeType,
          size,
          datePublished: publishDate.date,
        },
      })

      // Best-effort cleanup of the replaced PDF — the row stays updated even
      // if Blob cleanup fails. Only deletes when the URL actually changed.
      if (newBlobUrl && existing.blobUrl && existing.blobUrl !== newBlobUrl) {
        try {
          await del(existing.blobUrl)
        } catch (blobError) {
          console.error('[updateArchive | Blob Error]:', blobError)
        }
      }

      revalidateRepository()

      return {
        success: true,
        message: 'Archive updated.',
        payload: {
          id: archive.id,
          groupId: archive.groupId,
          title: archive.title,
          blobUrl: archive.blobUrl,
          fileName: archive.fileName,
          datePublished: archive.datePublished.toISOString(),
        },
      }
    } catch (dbError) {
      // Avoid orphaning the newly uploaded Blob when the DB update fails.
      if (newBlobUrl) {
        try {
          await del(newBlobUrl)
        } catch (blobError) {
          console.error('[updateArchive | Blob Cleanup Error]:', blobError)
        }
      }
      throw dbError
    }
  } catch (error) {
    console.error('[updateArchive | Error]:', error)
    return { success: false, message: 'Failed to update archive. Please try again.' }
  }
}

/**
 * Remove an archive from the Repository (admin-only).
 * Soft-deletes the CapstoneArchive row (deletedAt, mandatory soft-delete)
 * and deletes the Blob PDF. Blob deletion is best-effort: the row stays
 * removed even if Blob cleanup fails. Never throws.
 */
export async function removeArchive(id: number) {
  const session = await requireAdmin()
  if (!session?.user?.id) return unauthorized

  if (!Number.isInteger(id)) {
    return { success: false, message: 'Invalid archive.' }
  }

  try {
    const archive = await prisma.capstoneArchive.findFirst({
      where: { id, deletedAt: null },
    })
    if (!archive) {
      return { success: false, message: 'Archive not found.' }
    }

    await prisma.capstoneArchive.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    try {
      if (archive.blobUrl) {
        await del(archive.blobUrl)
      }
    } catch (blobError) {
      console.error('[removeArchive | Blob Error]:', blobError)
    }

    revalidateRepository()

    return { success: true, message: 'Archive removed.' }
  } catch (error) {
    console.error('[removeArchive | Error]:', error)
    return { success: false, message: 'Failed to remove archive. Please try again.' }
  }
}
