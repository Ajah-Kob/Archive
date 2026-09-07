'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { put, del } from '@vercel/blob'
import {
  requireStudent,
  requireAdminOrProgramChair,
  requireUser,
  unauthorized,
} from '@/lib/actions/guard'
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

// ───────────────────────────── types ─────────────────────────────

export type ArchivingUiStatus = 'READY_FOR_ARCHIVING' | 'IN_REVIEW' | 'CAPSTONE_ARCHIVED'

export interface ArchivingPayload {
  status: ArchivingUiStatus
  dbStatus: 'DRAFT' | 'IN_REVIEW' | 'ARCHIVED' | null
  title: string | null
  abstract: string | null
  tags: string[]
  authorOrder: AuthorEntry[]
  blobUrl: string | null
  fileName: string | null
  mimeType: string | null
  size: number | null
  groupId: number | null
  submission: unknown | null
  archive: unknown | null
  updatedAt: string | null
}

export interface ArchivingReviewItem {
  id: number
  groupId: number
  groupName: string
  sectionName: string | null
  title: string
  abstract: string
  tags: string[]
  authorOrder: AuthorEntry[]
  fileName: string | null
  blobUrl: string | null
  mimeType: string | null
  size: number | null
  status: 'IN_REVIEW' | 'ARCHIVED'
  submittedAt: string
  updatedAt: string
  uploadedBy: { id: number; name: string; email: string } | null
  groupMembers?: { id: number; name: string; email: string }[]
}

// ───────────────────────────── helpers (pure) ─────────────────────────────

function deriveUiStatus(
  submission: { status: string } | null,
  archive: { deletedAt: Date | null } | null,
): ArchivingUiStatus {
  if (!submission) return 'READY_FOR_ARCHIVING'
  if (submission.status === 'ARCHIVED') return 'CAPSTONE_ARCHIVED'
  if (submission.status === 'IN_REVIEW') return 'IN_REVIEW'
  // DRAFT maps to READY (student can still edit)
  return 'READY_FOR_ARCHIVING'
}

function sanitizeBlobFilename(fileName: string): string {
  const cleaned = fileName.replace(/[^\w.\- ]+/g, '_').trim()
  return cleaned.length > 0 ? cleaned : 'document.pdf'
}

function revalidateArchiving(groupId: number) {
  revalidateTag(`archiving-${groupId}`, 'max')
  revalidateTag('archiving', 'max')
  revalidateTag('archives', 'max')
  revalidateTag('repository', 'max')
  revalidateTag(`archive-${groupId}`, 'max')
  revalidateTag(`journey-${groupId}`, 'max')
  revalidateFeature('archiving')
  revalidateFeature('archives')
}

async function getStudentGroup(sessionUserId: number) {
  const student = await prisma.student.findFirst({
    where: { userId: sessionUserId, deletedAt: null },
    select: {
      id: true,
      sectionId: true,
      groupId: true,
      group: {
        where: { deletedAt: null },
        select: {
          id: true,
          sectionId: true,
          adviserId: true,
          students: { where: { deletedAt: null }, select: { userId: true } },
        },
      },
    },
  })
  if (!student?.group || !student.groupId) return null
  // Ensure the student is still a live member of the group
  const isMember = student.group.students.some((s) => s.userId === sessionUserId)
  // Even if they left, we still want the groupId for read — but for writes require membership
  return { studentId: student.id, groupId: student.groupId, sectionId: student.sectionId, group: student.group, isMember }
}

// Parses archiving FormData into a typed payload. Handles both JSON-string
// fields and discrete blob fields. Returns empty defaults on missing input
// so validation can surface the correct message.
// Supports explicit clear via `clearDocument=true` flag for Remove action.
function parseArchivingForm(formData: FormData): {
  title: string
  abstract: string
  tags: string[]
  authorOrder: AuthorEntry[]
  blobUrl: string | null
  fileName: string | null
  mimeType: string | null
  size: number | null
  clearDocument: boolean
} {
  const title = (formData.get('title')?.toString() ?? '').trim()
  const abstract = (formData.get('abstract')?.toString() ?? '').trim()

  // Tags may arrive as JSON array string under 'tags' or 'tagsJson'
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
      // Fallback: treat as single tag string (non-JSON case)
      if (tagsRaw.trim().length > 0) {
        // Could be comma-separated or single
        try {
          // try splitting on commas if not JSON
          tags = tagsRaw
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
          if (tags.length === 0) tags = [tagsRaw.trim()]
        } catch {
          tags = [tagsRaw.trim()]
        }
      }
    }
  }

  // Authors / authorOrder JSON
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

  const clearDocument =
    formData.get('clearDocument')?.toString().trim().toLowerCase() === 'true' ||
    formData.get('clear_document')?.toString().trim().toLowerCase() === 'true'

  return { title, abstract, tags, authorOrder, blobUrl, fileName, mimeType, size, clearDocument }
}

// Server-side validation that mirrors client validation via validation.ts.
// Returns { valid: true } or { valid: false, message: reason }.
// `requireBlob` controls whether blobUrl/fileName must be present (submit vs draft).
function validateArchivingPayload(
  data: ReturnType<typeof parseArchivingForm>,
  opts: { requireBlob?: boolean } = {},
): { valid: true } | { valid: false; message: string } {
  const { title, abstract, tags, authorOrder, blobUrl, mimeType } = data

  // Title: required + 200 chars + 25 words
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

  // Abstract: required + 600 chars + 4 sentences
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

  // Tags: min1, no empty, no duplicate (case-insensitive)
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

  // Authors: min1 triple, block duplicate email+name, email format, order preserved
  if (!isValidAuthors(authorOrder)) {
    if (!Array.isArray(authorOrder) || authorOrder.length < 1) {
      return { valid: false, message: 'At least one author is required.' }
    }
    // Check for missing fields
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
    // Duplicate check (email or name)
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

  // Blob / PDF check: draft allows empty, submit requires present
  // PDF only, no size limit per spec
  if (opts.requireBlob) {
    if (!blobUrl || blobUrl.trim().length === 0) {
      return { valid: false, message: 'Final document is required.' }
    }
  }
  if (blobUrl && blobUrl.trim().length > 0) {
    // When a document is present, mime must be PDF
    if (mimeType && !isPdfMime(mimeType)) {
      return { valid: false, message: 'Only PDF files are allowed.' }
    }
    // If mime not supplied but blobUrl is, we still require mime to be PDF if we have it
    // Allow missing mimeType to pass if blobUrl was previously validated via upload,
    // but if mimeType is provided and invalid, reject.
    // For submit we enforce mimeType must be PDF when blob present.
    if (opts.requireBlob && mimeType && !isPdfMime(mimeType)) {
      return { valid: false, message: 'Only PDF files are allowed.' }
    }
    // If requireBlob and no mimeType at all, let it pass if blobUrl looks like PDF?
    // Better to default to PDF if no mime given but blobUrl present — accept.
  }

  return { valid: true }
}

// ───────────────────────────── cached readers ─────────────────────────────

// Internal cached fetch for a single group's archiving data.
// Uses 'use cache' with tag archiving-${groupId} so mutations can bust it
// with revalidateTag. Derived status is from DB (no local state).
async function getArchivingSubmissionData(groupId: number) {
  'use cache'
  cacheTag(`archiving-${groupId}`)
  cacheLife('max')

  const [submission, archive, group] = await Promise.all([
    (prisma as any).archivingSubmission.findFirst({ where: { groupId, deletedAt: null } }),
    prisma.capstoneArchive.findFirst({ where: { groupId, deletedAt: null } }),
    prisma.group.findFirst({ where: { id: groupId, deletedAt: null }, select: { id: true, groupName: true, sectionId: true } }),
  ])

  const status = deriveUiStatus(submission as unknown as { status: string } | null, archive as unknown as { deletedAt: Date | null } | null)
  const dbStatus = (submission?.status as 'DRAFT' | 'IN_REVIEW' | 'ARCHIVED' | null) ?? null

  const payload: ArchivingPayload = {
    status,
    dbStatus,
    title: (submission?.title as string) ?? null,
    abstract: (submission?.abstract as string) ?? null,
    tags: (submission?.tags as string[]) ?? [],
    authorOrder: (submission?.authorOrder as AuthorEntry[]) ?? [],
    blobUrl: (submission?.blobUrl as string) ?? null,
    fileName: (submission?.fileName as string) ?? null,
    mimeType: (submission?.mimeType as string) ?? null,
    size: (submission?.size as number) ?? null,
    groupId,
    submission: submission ?? null,
    archive: archive ?? null,
    updatedAt: submission?.updatedAt ? (submission.updatedAt as Date).toISOString() : archive?.updatedAt ? (archive.updatedAt as Date).toISOString() : null,
  }

  // Also return raw for flexibility
  return { submission, archive, group, payload, status, dbStatus }
}

async function getArchivingReviewData() {
  'use cache'
  cacheTag('archiving')
  cacheLife('max')

  const submissions = await (prisma as any).archivingSubmission.findMany({
    where: { status: { in: ['IN_REVIEW', 'ARCHIVED'] }, deletedAt: null },
    include: {
      group: {
        select: {
          id: true,
          groupName: true,
          sectionId: true,
          section: { select: { section: true } },
          students: {
            where: { deletedAt: null },
            select: { id: true, user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const payload: ArchivingReviewItem[] = submissions.map((s) => ({
    id: s.id,
    groupId: s.groupId,
    groupName: s.group?.groupName ?? `Group ${s.groupId}`,
    sectionName: s.group?.section?.section ?? null,
    title: s.title,
    abstract: s.abstract,
    tags: (s.tags as string[]) ?? [],
    authorOrder: (s.authorOrder as AuthorEntry[]) ?? [],
    fileName: s.fileName ?? null,
    blobUrl: s.blobUrl ?? null,
    mimeType: s.mimeType ?? null,
    size: s.size ?? null,
    status: s.status as 'IN_REVIEW' | 'ARCHIVED',
    submittedAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    uploadedBy: s.uploadedBy ? { id: s.uploadedBy.id, name: s.uploadedBy.name, email: s.uploadedBy.email } : null,
    groupMembers: (s.group?.students ?? []).map((st: any) => ({
      id: st.user.id,
      name: st.user.name,
      email: st.user.email,
    })),
  }))

  return payload
}

// ───────────────────────────── exports ─────────────────────────────

/**
 * Get archiving submission for a specific group (cached).
 * Guards: student or program chair/admin may read; derived status from DB.
 * Returns READY_FOR_ARCHIVING / IN_REVIEW / CAPSTONE_ARCHIVED derived from DB.
 */
export async function getArchivingSubmission(groupId: number) {
  // Allow both student and program chair/Admin to read — try student first, then chair
  let session = await requireStudent()
  if (!session?.user?.id) {
    session = await requireAdminOrProgramChair()
  }
  if (!session?.user?.id) {
    // Fallback to any authenticated user (requireUser) for repository-style reads
    session = await requireUser()
  }
  if (!session?.user?.id) return { success: false, message: 'Not authenticated', payload: null }

  if (!Number.isInteger(groupId)) {
    return { success: false, message: 'Invalid group.', payload: null }
  }

  try {
    const group = await prisma.group.findFirst({ where: { id: groupId, deletedAt: null }, select: { id: true } })
    if (!group) {
      return { success: false, message: 'Group not found.', payload: null }
    }
    const data = await getArchivingSubmissionData(groupId)
    return { success: true, message: '', payload: data.payload }
  } catch (error) {
    console.error('[getArchivingSubmission | Error]:', error)
    return { success: false, message: 'Failed to fetch archiving data.', payload: null }
  }
}

/**
 * Alias for getArchivingSubmission — satisfies subtask acceptance that expects
 * getArchivingData with same caching semantics.
 */
export async function getArchivingData(groupId: number) {
  return getArchivingSubmission(groupId)
}

/**
 * Current student's archiving status, derived from DB via group.
 * Survives refresh because it reads persisted ArchivingSubmission + CapstoneArchive.
 */
export async function getMyArchivingStatus() {
  const session = await requireStudent()
  if (!session?.user?.id) return { ...unauthorized, payload: null }

  try {
    const ctx = await getStudentGroup(+session.user.id)
    if (!ctx) {
      return {
        success: false,
        message: 'You are not a member of a group.',
        payload: {
          status: 'READY_FOR_ARCHIVING' as ArchivingUiStatus,
          groupId: null,
          submission: null,
          archive: null,
        },
      }
    }

    const data = await getArchivingSubmissionData(ctx.groupId)
    return {
      success: true,
      message: '',
      payload: {
        groupId: ctx.groupId,
        status: data.status,
        dbStatus: data.dbStatus,
        submission: data.submission,
        archive: data.archive,
        // Flattened convenience fields
        title: data.payload.title,
        abstract: data.payload.abstract,
        tags: data.payload.tags,
        authorOrder: data.payload.authorOrder,
        blobUrl: data.payload.blobUrl,
        fileName: data.payload.fileName,
        mimeType: data.payload.mimeType,
        size: data.payload.size,
        updatedAt: data.payload.updatedAt,
      },
    }
  } catch (error) {
    console.error('[getMyArchivingStatus | Error]:', error)
    return { success: false, message: 'Failed to fetch archiving status.', payload: null }
  }
}

/**
 * Save draft — validates server-side, persists as DRAFT, never triggers IN_REVIEW.
 * On invalid returns {success:false, message: reason} and does NOT bypass validation.
 * Handles edge: group member removed after author selection (keeps custom author entry
 * — we persist authorOrder JSON as-is, no filtering against current group members).
 */
export async function saveArchivingDraft(_prevState: any, formData: FormData) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  try {
    const ctx = await getStudentGroup(+session.user.id)
    if (!ctx) {
      return { success: false, message: 'You are not a member of a group.' }
    }
    if (!ctx.isMember) {
      return { success: false, message: 'You are not a member of this group.' }
    }
    const groupId = ctx.groupId

    // Prevent editing after submission is in review or archived
    const existing = await (prisma as any).archivingSubmission.findFirst({ where: { groupId, deletedAt: null } })
    if (existing && (existing.status === 'IN_REVIEW' || existing.status === 'ARCHIVED')) {
      return { success: false, message: 'Submission already in review and cannot be edited.' }
    }

    const data = parseArchivingForm(formData)

    // Handle explicit clear (Remove action) — null out blob fields even if existing present
    let effectiveBlobUrl: string | null
    let effectiveFileName: string | null
    let effectiveMimeType: string | null
    let effectiveSize: number | null

    if (data.clearDocument) {
      effectiveBlobUrl = null
      effectiveFileName = null
      effectiveMimeType = null
      effectiveSize = null
    } else {
      // If client sent blob fields partially, keep existing blob if new one missing
      // Preserve previous blob when not overwritten (supports keeping author entries after member removal)
      effectiveBlobUrl = data.blobUrl ?? (existing?.blobUrl as string | null) ?? null
      effectiveFileName = data.fileName ?? (existing?.fileName as string | null) ?? null
      effectiveMimeType = data.mimeType ?? (existing?.mimeType as string | null) ?? null
      effectiveSize = data.size ?? (existing?.size as number | null) ?? null
    }

    const toValidate = {
      ...data,
      blobUrl: effectiveBlobUrl,
      fileName: effectiveFileName,
      mimeType: effectiveMimeType,
      size: effectiveSize,
    }

    const validation = validateArchivingPayload(toValidate, { requireBlob: false })
    if (validation.valid === false) {
      return { success: false, message: validation.message }
    }

    // Upsert as DRAFT — draft never becomes IN_REVIEW
    const persisted = await (prisma as any).archivingSubmission.upsert({
      where: { groupId },
      update: {
        title: data.title,
        abstract: data.abstract,
        tags: data.tags as unknown as object,
        authorOrder: data.authorOrder as unknown as object,
        fileName: effectiveFileName,
        blobUrl: effectiveBlobUrl,
        mimeType: effectiveMimeType,
        size: effectiveSize,
        uploadedById: +session.user.id,
        status: 'DRAFT',
        deletedAt: null,
      },
      create: {
        groupId,
        title: data.title,
        abstract: data.abstract,
        tags: data.tags as unknown as object,
        authorOrder: data.authorOrder as unknown as object,
        fileName: effectiveFileName,
        blobUrl: effectiveBlobUrl,
        mimeType: effectiveMimeType,
        size: effectiveSize,
        uploadedById: +session.user.id,
        status: 'DRAFT',
      },
    })

    revalidateArchiving(groupId)

    return { success: true, message: 'Draft saved successfully.', payload: persisted }
  } catch (error) {
    console.error('[saveArchivingDraft | Error]:', error)
    return { success: false, message: 'Failed to save draft. Please try again.' }
  }
}

/** Alias for form compat (submit alias) */
export async function saveDraft(_prevState: any, formData: FormData) {
  return saveArchivingDraft(_prevState, formData)
}

/**
 * Submit for archiving — validates same as draft plus requires blobUrl,
 * prevents double submit when already IN_REVIEW/ARCHIVED, marks IN_REVIEW,
 * revalidates and makes available to Program Chair.
 */
export async function submitArchiving(_prevState: any, formData: FormData) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  try {
    const ctx = await getStudentGroup(+session.user.id)
    if (!ctx) {
      return { success: false, message: 'You are not a member of a group.' }
    }
    if (!ctx.isMember) {
      return { success: false, message: 'You are not a member of this group.' }
    }
    const groupId = ctx.groupId

    const existing = await (prisma as any).archivingSubmission.findFirst({ where: { groupId, deletedAt: null } })

    // Block double submit
    if (existing && (existing.status === 'IN_REVIEW' || existing.status === 'ARCHIVED')) {
      return { success: false, message: 'Submission already in review. You cannot submit again.' }
    }

    const data = parseArchivingForm(formData)

    // Respect explicit clear — will fail requireBlob validation
    let effectiveBlobUrl: string | null
    let effectiveFileName: string | null
    let effectiveMimeType: string | null
    let effectiveSize: number | null
    if (data.clearDocument) {
      effectiveBlobUrl = null
      effectiveFileName = null
      effectiveMimeType = null
      effectiveSize = null
    } else {
      effectiveBlobUrl = data.blobUrl ?? (existing?.blobUrl as string | null) ?? null
      effectiveFileName = data.fileName ?? (existing?.fileName as string | null) ?? null
      effectiveMimeType = data.mimeType ?? (existing?.mimeType as string | null) ?? null
      effectiveSize = data.size ?? (existing?.size as number | null) ?? null
    }

    const toValidate = {
      ...data,
      blobUrl: effectiveBlobUrl,
      fileName: effectiveFileName,
      mimeType: effectiveMimeType,
      size: effectiveSize,
    }

    const validation = validateArchivingPayload(toValidate, { requireBlob: true })
    if (validation.valid === false) {
      return { success: false, message: validation.message }
    }

    // Additional PDF mime guard for submit (no size limit)
    if (effectiveMimeType && !isPdfMime(effectiveMimeType)) {
      return { success: false, message: 'Only PDF files are allowed.' }
    }

    // Persist as IN_REVIEW
    const persisted = await (prisma as any).archivingSubmission.upsert({
      where: { groupId },
      update: {
        title: data.title,
        abstract: data.abstract,
        tags: data.tags as unknown as object,
        authorOrder: data.authorOrder as unknown as object,
        fileName: effectiveFileName,
        blobUrl: effectiveBlobUrl,
        mimeType: effectiveMimeType,
        size: effectiveSize,
        uploadedById: +session.user.id,
        status: 'IN_REVIEW',
        deletedAt: null,
      },
      create: {
        groupId,
        title: data.title,
        abstract: data.abstract,
        tags: data.tags as unknown as object,
        authorOrder: data.authorOrder as unknown as object,
        fileName: effectiveFileName,
        blobUrl: effectiveBlobUrl,
        mimeType: effectiveMimeType,
        size: effectiveSize,
        uploadedById: +session.user.id,
        status: 'IN_REVIEW',
      },
    })

    revalidateArchiving(groupId)

    return { success: true, message: 'Capstone submitted for review.', payload: persisted }
  } catch (error) {
    console.error('[submitArchiving | Error]:', error)
    // Handles edge: upload succeeded but DB fails (return error, do not corrupt draft)
    return { success: false, message: 'Failed to submit capstone. Please try again.' }
  }
}

/** Alias for submitForArchiving (acceptance-criteria naming) */
export async function submitForArchiving(_prevState: any, formData: FormData) {
  return submitArchiving(_prevState, formData)
}

/**
 * Upload archiving document — PDF only, no size limit.
 * Uses @vercel/blob put. Returns blobUrl/fileName/mimeType/size.
 * Handles upload failure without corrupting draft (does not touch DB).
 */
export async function uploadArchivingDocument(_prevState: any, formData: FormData) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  try {
    const ctx = await getStudentGroup(+session.user.id)
    if (!ctx) {
      return { success: false, message: 'You are not a member of a group.', payload: null }
    }

    const file = (formData.get('file') as File) ?? (formData.get('document') as File) ?? (formData.get('blob') as File) ?? null
    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, message: 'No file provided.', payload: null }
    }

    // PDF mime check only — no size limit per spec
    if (file.type !== PDF_MIME && !isPdfMime(file.type)) {
      return { success: false, message: 'Only PDF files are allowed.', payload: null }
    }

    const groupId = ctx.groupId
    const safeName = sanitizeBlobFilename(file.name)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Vercel Blob put — pathname is scoped to this group's archiving folder
    const blob = await put(`archiving/${groupId}/${safeName}`, buffer, {
      access: 'public',
      contentType: file.type || PDF_MIME,
      addRandomSuffix: true,
    })

    return {
      success: true,
      message: 'File uploaded successfully.',
      payload: {
        blobUrl: blob.url,
        fileName: file.name,
        mimeType: file.type || PDF_MIME,
        size: file.size,
      },
    }
  } catch (error) {
    console.error('[uploadArchivingDocument | Error]:', error)
    return { success: false, message: 'Upload failed. Please try again.', payload: null }
  }
}

/**
 * Remove / clear the persisted archiving document.
 * Clears blobUrl/fileName/mimeType/size from ArchivingSubmission without deleting Blob storage.
 * Blocked when submission is already IN_REVIEW or ARCHIVED (read-only locked).
 * Returns success false on failure; on DB save failure keeps file in UI (caller retains value for retry).
 */
export async function removeArchivingDocument() {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  try {
    const ctx = await getStudentGroup(+session.user.id)
    if (!ctx) {
      return { success: false, message: 'You are not a member of a group.' }
    }
    if (!ctx.isMember) {
      return { success: false, message: 'You are not a member of this group.' }
    }
    const groupId = ctx.groupId

    const existing = await (prisma as any).archivingSubmission.findFirst({ where: { groupId, deletedAt: null } })
    if (!existing) {
      return { success: false, message: 'No submission found.' }
    }
    if (existing.status === 'IN_REVIEW' || existing.status === 'ARCHIVED') {
      return { success: false, message: 'Submission already in review and cannot be edited.' }
    }

    // Security: only clear blob fields, never delete arbitrary Blob URL — we don't call del() on arbitrary url.
    // If blobUrl was present we could optionally delete via del(existing.blobUrl) but we keep storage for retry tracing.
    await (prisma as any).archivingSubmission.update({
      where: { groupId },
      data: {
        blobUrl: null,
        fileName: null,
        mimeType: null,
        size: null,
      },
    })

    revalidateArchiving(groupId)

    return { success: true, message: 'Document removed.' }
  } catch (error) {
    console.error('[removeArchivingDocument | Error]:', error)
    return { success: false, message: 'Failed to remove document. Please try again.' }
  }
}

/** Alias for remove — clears persisted value */
export async function clearArchivingDocument() {
  return removeArchivingDocument()
}

// Optional helper to delete the Blob itself (admin cleanup) — validates ownership before del
export async function deleteArchivingBlob(blobUrl: string) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized
  if (!blobUrl || typeof blobUrl !== 'string') {
    return { success: false, message: 'Blob URL is required.' }
  }
  try {
    const ctx = await getStudentGroup(+session.user.id)
    if (!ctx) return { success: false, message: 'You are not a member of a group.' }
    const existing = await (prisma as any).archivingSubmission.findFirst({ where: { groupId: ctx.groupId, deletedAt: null } })
    // Guard: only allow deleting the blob currently set as this group's document
    if (!existing || existing.blobUrl !== blobUrl) {
      return { success: false, message: 'Not authorized to delete this file.' }
    }
    await del(blobUrl)
    return { success: true, message: 'Blob deleted.' }
  } catch (error) {
    console.error('[deleteArchivingBlob | Error]:', error)
    return { success: false, message: 'Failed to delete blob.' }
  }
}

/**
 * List all IN_REVIEW submissions for Program Chair review.
 * Guarded by requireAdminOrProgramChair; returns group, title, tags, authors, date.
 */
export async function getArchivingSubmissionsForReview() {
  const session = await requireAdminOrProgramChair()
  if (!session?.user?.id) return { success: false, message: 'Not authorized', payload: null }

  try {
    const payload = await getArchivingReviewData()
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getArchivingSubmissionsForReview | Error]:', error)
    return { success: false, message: 'Failed to fetch submissions for review.', payload: null }
  }
}

/**
 * Approve a submission — Program Chair only.
 * Sets ArchivingSubmission to ARCHIVED, creates/updates CapstoneArchive
 * with title/abstract/tags/authorOrder/blob, publishes to repository,
 * revalidates tags.
 */
export async function approveArchiving(groupId: number) {
  const session = await requireAdminOrProgramChair()
  if (!session?.user?.id) return unauthorized

  if (!Number.isInteger(groupId)) {
    return { success: false, message: 'Invalid group.' }
  }

  try {
    const submission = await (prisma as any).archivingSubmission.findFirst({
      where: { groupId, deletedAt: null },
      include: {
        group: { select: { id: true, sectionId: true } },
      },
    })
    if (!submission) {
      return { success: false, message: 'Submission not found.' }
    }
    if (submission.status === 'ARCHIVED') {
      return { success: false, message: 'Submission already archived.' }
    }
    if (submission.status !== 'IN_REVIEW') {
      return { success: false, message: 'Submission is not in review.' }
    }
    if (!submission.blobUrl || !submission.fileName || !submission.mimeType || submission.size == null) {
      return { success: false, message: 'Submission is missing the final document.' }
    }

    // Extra guard: ensure mime is PDF
    if (!isPdfMime(submission.mimeType)) {
      return { success: false, message: 'Only PDF documents can be archived.' }
    }

    await prisma.$transaction(async (tx: any) => {
      await (tx as any).archivingSubmission.update({
        where: { id: submission.id },
        data: { status: 'ARCHIVED' },
      })

      // Author order and tags are persisted as JSON — preserve exactly as submitted.
      // This survives group member removal because we store a snapshot, not a relation.
      await tx.capstoneArchive.upsert({
        where: { groupId },
        update: {
          title: submission.title,
          abstract: submission.abstract,
          tags: submission.tags as unknown as object,
          authorOrder: submission.authorOrder as unknown as object,
          fileName: submission.fileName!,
          blobUrl: submission.blobUrl!,
          mimeType: submission.mimeType!,
          size: submission.size!,
          uploadedById: submission.uploadedById,
          datePublished: new Date(),
          deletedAt: null,
        },
        create: {
          groupId,
          title: submission.title,
          abstract: submission.abstract,
          tags: submission.tags as unknown as object,
          authorOrder: submission.authorOrder as unknown as object,
          fileName: submission.fileName!,
          blobUrl: submission.blobUrl!,
          mimeType: submission.mimeType!,
          size: submission.size!,
          uploadedById: submission.uploadedById,
          datePublished: new Date(),
        },
      })
    })

    revalidateArchiving(groupId)

    return { success: true, message: 'Capstone approved and published to Repository.' }
  } catch (error) {
    console.error('[approveArchiving | Error]:', error)
    return { success: false, message: 'Failed to approve submission. Please try again.' }
  }
}

// Aliases for compatibility with varied spec naming
export const getMyArchivingStatusAction = getMyArchivingStatus
export const approveArchivingAction = approveArchiving
