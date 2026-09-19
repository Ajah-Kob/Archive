'use server'

import { head, del } from '@vercel/blob'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import prisma from '@/lib/prisma'
import { cacheTag, cacheLife, revalidateTag } from 'next/cache'
import { requireStudent, unauthorized } from '@/lib/actions/guard'
import type {
  DefenseType,
  DefenseVerdict,
  PanelistRole,
  DefenseReviewStatus,
} from '@prisma/client'

// ───────────────────────────── Constants ─────────────────────────────

const MAX_SIZE_BYTES = 20 * 1024 * 1024

// ───────────────────────────── Types ─────────────────────────────

export interface DefenseDocumentUpload {
  blobUrl: string
  fileName: string
  size: number
  mimeType: string
}

export interface DefenseSubmissionReviewItem {
  panelistId: number
  name: string
  image: string | null
  status: DefenseReviewStatus
  reviewedAt: string | null
}

export interface DefenseSubmissionItem {
  id: number
  isInitial: boolean
  version: number
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
  dateSubmitted: string
  submittedByName: string
  /** Initial submission: DefenseSchedule.verdict. Resubmission: derived from reviews. */
  status: string
  reviews: DefenseSubmissionReviewItem[]
  annotationStats?: { comments: number; pages: number } | null
}

export interface DefensePanelistItem {
  userId: number
  name: string
  email: string
  image: string | null
  role: PanelistRole
  /**
   * Counts from the initial submission's COMMITTED annotation rows only.
   * DRAFT rows are never exposed (counts or content) — mirrors the faculty
   * side, which prefers committed and treats draft-only as unsubmitted.
   */
  feedback?: { comments: number; pages: number; hasCommitted?: boolean } | null
}

export interface StudentDefenseMemberItem {
  userId: number
  name: string
  email: string
  image: string | null
  isLeader: boolean
}

export interface StudentDefenseSessionPayload {
  id: number
  groupId: number
  groupName: string
  sectionName: string
  adviserName: string | null
  type: DefenseType
  date: string
  startTime: string
  endTime: string
  venue: string
  verdict: DefenseVerdict
  verdictSubmittedAt: string | null
  panelists: DefensePanelistItem[]
  members: StudentDefenseMemberItem[]
  submissions: DefenseSubmissionItem[]
  annotationStats?: { comments: number; pages: number } | null
}

// ───────────────────────────── Helpers ─────────────────────────────

function sanitizeBlobFilename(fileName: string): string {
  const cleaned = fileName.replace(/[^\w.\- ]+/g, '_').trim()
  return cleaned.length > 0 ? cleaned : 'document.pdf'
}

/**
 * Derives the display status for a resubmission from its panelist reviews.
 * Rules (from docs/context/lookup/submission-statuses.md):
 *   - all APPROVED  → 'Approved'
 *   - any PENDING   → 'In Review'
 *   - any REJECTED  → 'Rejected'
 */
function deriveResubmissionStatus(
  reviews: { status: DefenseReviewStatus }[],
): string {
  if (reviews.length === 0) return 'In Review'
  if (reviews.every((r) => r.status === 'APPROVED')) return 'Approved'
  if (reviews.some((r) => r.status === 'REJECTED')) return 'Rejected'
  return 'In Review'
}

function mapStudentMembers(
  students: Array<{
    id: number
    user: { id: number; name: string; email: string; image: string | null }
  }>,
  leaderStudentId: number | null | undefined,
): StudentDefenseMemberItem[] {
  const mapped = students.map((s) => ({
    userId: s.user.id,
    name: s.user.name,
    email: s.user.email,
    image: s.user.image,
    isLeader: leaderStudentId != null && s.id === leaderStudentId,
  }))
  const leader = mapped.filter((m) => m.isLeader)
  const rest = mapped.filter((m) => !m.isLeader)
  return [...leader, ...rest]
}

// ───────────────────────────── getDefenseSessionData ─────────────────────────────

// Inner function — keyed on userId + DefenseType so each milestone gets its
// own payload. Not 'use cache': the page re-fetches on refresh so the card +
// document history always reflect the persisted submission (matches chapter flow).
async function getStudentDefenseSessionData(
  userId: number,
  type: DefenseType,
): Promise<StudentDefenseSessionPayload | null> {
  // Find the defense schedule for the student's group and requested DefenseType
  // via the Student → Group relation. A group has at most one schedule per type.
  const schedule = await prisma.defenseSchedule.findFirst({
    where: {
      deletedAt: null,
      type,
      group: {
        deletedAt: null,
        students: {
          some: {
            userId,
            deletedAt: null,
          },
        },
      },
    },
    include: {
      group: {
        include: {
          section: { select: { id: true, section: true } },
          adviser: {
            include: {
              faculty: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
            },
          },
          students: {
            where: { deletedAt: null },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
            orderBy: { id: 'asc' },
          },
        },
      },
      panelists: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { role: 'asc' },
      },
      submissions: {
        where: { deletedAt: null },
        include: {
          user: { select: { name: true } },
          reviews: {
            where: { deletedAt: null },
            include: {
              panelist: { select: { id: true, name: true, image: true } },
            },
          },
          annotations: {
            where: { deletedAt: null },
            select: { authorId: true, status: true, data: true },
          },
        },
        orderBy: { version: 'asc' },
      },
    },
  })

  if (!schedule) return null

  // Per-panelist feedback for the student tab — same source rule as the
  // faculty side: the INITIAL submission's COMMITTED rows only (never
  // reset by resubmissions, never leaking DRAFT content or counts).
  const initialForFeedback = (schedule.submissions.find((s) => s.isInitial) ??
    schedule.submissions[0]) as
    | { annotations?: Array<{ authorId: number; status: string; data: unknown }> }
    | undefined
  const committedByAuthor = new Map<number, { comments: number; pages: number }>()
  for (const row of initialForFeedback?.annotations ?? []) {
    if (row.status !== 'COMMITTED') continue
    const items = Array.isArray(row.data) ? (row.data as unknown[]) : []
    if (items.length === 0) continue
    const pages = new Set(
      items
        .map(
          (it) =>
            (it as unknown as { annotation?: { pageIndex?: number } })?.annotation
              ?.pageIndex,
        )
        .filter((v): v is number => typeof v === 'number'),
    ).size
    committedByAuthor.set(row.authorId, {
      comments: items.length,
      pages: pages || 1,
    })
  }

  return {
    id: schedule.id,
    groupId: schedule.groupId,
    groupName: schedule.group.groupName,
    sectionName: schedule.group.section.section,
    adviserName: schedule.group.adviser?.faculty.user.name ?? null,
    type: schedule.type,
    date: schedule.date.toISOString(),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    venue: schedule.venue,
    verdict: schedule.verdict,
    verdictSubmittedAt: (schedule as unknown as { verdictSubmittedAt?: Date | null }).verdictSubmittedAt?.toISOString() ?? null,
    panelists: schedule.panelists.map((p) => {
      const fb = committedByAuthor.get(p.userId) ?? null
      return {
        userId: p.userId,
        name: p.user.name,
        email: p.user.email,
        image: p.user.image,
        role: p.role,
        feedback: fb
          ? { comments: fb.comments, pages: fb.pages, hasCommitted: true }
          : null,
      }
    }),
    members: mapStudentMembers(
      schedule.group.students as unknown as Array<{
        id: number
        user: { id: number; name: string; email: string; image: string | null }
      }>,
      (schedule.group as unknown as { leaderStudentId: number | null }).leaderStudentId ?? null,
    ),
    annotationStats: (() => {
      const latest = schedule.submissions[schedule.submissions.length - 1] as unknown as { annotations?: Array<{ data: unknown }> } | undefined
      if (!latest?.annotations || latest.annotations.length === 0) return null
      const allItems = latest.annotations.flatMap((a) => (Array.isArray(a.data) ? (a.data as unknown[]) : []))
      if (allItems.length === 0) return null
      const pages = new Set(
        allItems
          .map((it) => (it as unknown as { annotation?: { pageIndex?: number } })?.annotation?.pageIndex)
          .filter((v): v is number => typeof v === 'number'),
      ).size
      return { comments: allItems.length, pages: pages || 1 }
    })(),
        submissions: schedule.submissions.map((s) => {
      const sWithAnn = s as unknown as { annotations?: Array<{ authorId: number; data: unknown; status: string }> }
      let annStats: { comments: number; pages: number } | null = null
      if (sWithAnn.annotations && sWithAnn.annotations.length > 0) {
        const allItems = sWithAnn.annotations.flatMap((a) => (Array.isArray(a.data) ? (a.data as unknown[]) : []))
        if (allItems.length > 0) {
          const pages = new Set(
            allItems
              .map((it) => (it as unknown as { annotation?: { pageIndex?: number } })?.annotation?.pageIndex)
              .filter((v): v is number => typeof v === 'number'),
          ).size
          annStats = { comments: allItems.length, pages: pages || 1 }
        }
      }
      const annByAuthor = new Map<number, { comments: number; pages: number }>()
      if (sWithAnn.annotations) {
        for (const a of sWithAnn.annotations) {
          const items = Array.isArray(a.data) ? (a.data as unknown[]) : []
          if (items.length === 0) continue
          const pages = new Set(
            items
              .map((it) => (it as unknown as { annotation?: { pageIndex?: number } })?.annotation?.pageIndex)
              .filter((v): v is number => typeof v === 'number'),
          ).size
          annByAuthor.set(a.authorId, { comments: items.length, pages: pages || 1 })
        }
      }
      return {
        id: s.id,
        isInitial: s.isInitial,
        version: s.version,
        fileName: s.fileName,
        blobUrl: s.blobUrl,
        mimeType: s.mimeType,
        size: s.size,
        dateSubmitted: s.createdAt.toISOString(),
        submittedByName: s.user.name,
        annotationStats: annStats,
        // Initial submission status = DefenseSchedule.verdict (not from reviews).
        // Resubmission status = derived from DefenseSubmissionReview rows.
        status: s.isInitial
          ? schedule.verdict
          : deriveResubmissionStatus(s.reviews),
        reviews: s.reviews.map((r) => {
          const fb = annByAuthor.get(r.panelistId) ?? null
          return {
            panelistId: r.panelistId,
            name: r.panelist.name,
            image: r.panelist.image,
            status: r.status,
            reviewedAt: r.reviewedAt?.toISOString() ?? null,
            feedback: fb,
            comments: fb?.comments ?? 0,
            pages: fb?.pages ?? 0,
          }
        }),
      }
    }),
  }
}

/**
 * Returns the defense session payload for the current student's group and
 * requested DefenseType, including schedule info, panelists, and all
 * submissions with derived status. Not 'use cache': the page re-fetches on
 * refresh so the card + document history always reflect the persisted
 * submission (matches the chapter flow).
 */
export async function getDefenseSessionData(type: DefenseType) {
  const session = await requireStudent()
  if (!session?.user?.id) return { ...unauthorized, payload: null }

  try {
    const payload = await getStudentDefenseSessionData(+session.user.id, type)
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getDefenseSessionData | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch defense session data',
      payload: null,
    }
  }
}

// ───────────────────────────── Upload verification ─────────────────────────────

/**
 * Verifies a Vercel Blob upload exists under the expected defense path,
 * is a PDF, and matches the claimed size. Returns null on success or an
 * error message string on failure.
 */
async function verifyDefenseUpload(
  scheduleId: number,
  upload: DefenseDocumentUpload,
): Promise<string | null> {
  if (
    typeof upload?.blobUrl !== 'string' ||
    typeof upload?.fileName !== 'string' ||
    upload.fileName.length === 0 ||
    upload.fileName.length > 255 ||
    !Number.isFinite(upload?.size) ||
    upload.size <= 0
  ) {
    return 'Invalid upload data.'
  }
  if (upload.size > MAX_SIZE_BYTES) {
    return 'File is too large (max 20MB).'
  }

  let meta
  try {
    meta = await head(upload.blobUrl)
  } catch {
    return 'The uploaded file could not be found. Please upload it again.'
  }
  if (!meta) {
    return 'The uploaded file could not be found. Please upload it again.'
  }
  if (!meta.pathname.startsWith(`defense/${scheduleId}/`)) {
    return 'The uploaded file does not belong to this defense session.'
  }
  if (meta.contentType !== 'application/pdf') {
    return 'Only PDF files are allowed.'
  }
  if (meta.size !== upload.size) {
    return 'The uploaded file is incomplete. Please upload it again.'
  }
  return null
}

// ───────────────────────────── submitDefenseDocument ─────────────────────────────

/**
 * Creates the initial defense document submission (isInitial: true, version: 1).
 * Validates: student is in a group with a defense schedule, no prior initial
 * submission exists, and the uploaded blob is valid.
 */
export async function submitDefenseDocument(
  upload: DefenseDocumentUpload,
): Promise<{
  success: boolean
  message: string
  payload?: { submissionId: number }
}> {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  // Find the defense schedule for the student's group.
  const schedule = await prisma.defenseSchedule.findFirst({
    where: {
      deletedAt: null,
      group: {
        deletedAt: null,
        students: {
          some: { userId: +session.user.id, deletedAt: null },
        },
      },
    },
    select: { id: true },
  })
  if (!schedule) {
    return {
      success: false,
      message: 'No defense schedule found for your group.',
    }
  }

  // Guard: no prior initial submission may exist.
  const existingInitial = await prisma.defenseSubmission.findFirst({
    where: {
      scheduleId: schedule.id,
      isInitial: true,
      deletedAt: null,
    },
    select: { id: true },
  })
  if (existingInitial) {
    return {
      success: false,
      message: 'An initial defense document has already been submitted.',
    }
  }

  // Verify the client-side upload actually completed.
  const uploadError = await verifyDefenseUpload(schedule.id, upload)
  if (uploadError) return { success: false, message: uploadError }

  try {
    const submission = await prisma.defenseSubmission.create({
      data: {
        scheduleId: schedule.id,
        submittedBy: +session.user.id,
        isInitial: true,
        version: 1,
        fileName: upload.fileName,
        blobUrl: upload.blobUrl,
        mimeType: upload.mimeType,
        size: upload.size,
      },
    })

    revalidateTag('defense', 'max')

    return {
      success: true,
      message: 'Defense document submitted for review.',
      payload: { submissionId: submission.id },
    }
  } catch (error) {
    console.error('[submitDefenseDocument | Error]:', error)
    return {
      success: false,
      message: 'Failed to submit defense document. Please try again.',
    }
  }
}

// ───────────────────────────── resubmitDefenseDocument ─────────────────────────────

/**
 * Creates a resubmission defense document (isInitial: false, version: N+1).
 * Validates: student is in a group with a defense schedule, a prior submission
 * exists, the verdict is MINOR_REVISION or MAJOR_REVISION, and the uploaded
 * blob is valid. Creates DefenseSubmissionReview rows for each panelist.
 */
export async function resubmitDefenseDocument(
  upload: DefenseDocumentUpload,
): Promise<{
  success: boolean
  message: string
  payload?: { submissionId: number }
}> {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  // Find the defense schedule for the student's group.
  const schedule = await prisma.defenseSchedule.findFirst({
    where: {
      deletedAt: null,
      group: {
        deletedAt: null,
        students: {
          some: { userId: +session.user.id, deletedAt: null },
        },
      },
    },
    select: { id: true, verdict: true },
  })
  if (!schedule) {
    return {
      success: false,
      message: 'No defense schedule found for your group.',
    }
  }

  // Guard: a prior submission must exist.
  const priorSubmission = await prisma.defenseSubmission.findFirst({
    where: { scheduleId: schedule.id, deletedAt: null },
    select: { id: true },
  })
  if (!priorSubmission) {
    return { success: false, message: 'No prior submission to resubmit.' }
  }

  // Guard: resubmission is only allowed after a revision verdict.
  if (
    schedule.verdict !== 'MINOR_REVISION' &&
    schedule.verdict !== 'MAJOR_REVISION' &&
    schedule.verdict !== 'REJECTED'
  ) {
    return {
      success: false,
      message: 'Resubmission is only allowed after a revision verdict.',
    }
  }

  // B — strict: if a resubmission already exists, allow next upload only when
  // all panelists have finished reviewing and the result is Need Revision.
  const existingResubmission = await prisma.defenseSubmission.findFirst({
    where: { scheduleId: schedule.id, isInitial: false, deletedAt: null },
    orderBy: { version: 'desc' },
    select: { id: true },
  })
  if (existingResubmission) {
    const reviews = await prisma.defenseSubmissionReview.findMany({
      where: { submissionId: existingResubmission.id, deletedAt: null },
      select: { status: true },
    })
    const hasPending = reviews.some((r) => r.status === 'PENDING')
    if (hasPending) {
      return {
        success: false,
        message: 'All panelists must finish reviewing before you can resubmit.',
      }
    }
    const hasRejected = reviews.some((r) => r.status === 'REJECTED')
    if (!hasRejected) {
      return {
        success: false,
        message: 'Resubmission is only allowed when a revision is requested.',
      }
    }
  }

  // Verify the client-side upload actually completed.
  const uploadError = await verifyDefenseUpload(schedule.id, upload)
  if (uploadError) return { success: false, message: uploadError }

  // Determine the next version number from the existing chain.
  const latest = await prisma.defenseSubmission.findFirst({
    where: { scheduleId: schedule.id, deletedAt: null },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  const nextVersion = (latest?.version ?? 0) + 1

  // Fetch panelists so we can create review rows for each.
  const panelists = await prisma.defensePanelist.findMany({
    where: { defenseScheduleId: schedule.id, deletedAt: null },
    select: { userId: true },
  })

  // Carry-forward: APPROVED stays approved, REJECTED resets to PENDING
  // Build map of previous resubmission reviews if exists (from B-strict guard)
  let prevReviewStatusByPanelist = new Map<number, string>()
  if (existingResubmission) {
    const prevReviews = await prisma.defenseSubmissionReview.findMany({
      where: { submissionId: existingResubmission.id, deletedAt: null },
      select: { panelistId: true, status: true },
    })
    for (const r of prevReviews) {
      prevReviewStatusByPanelist.set(r.panelistId, r.status)
    }
  }

  try {
    const submission = await prisma.$transaction(async (tx) => {
      return tx.defenseSubmission.create({
        data: {
          scheduleId: schedule.id,
          submittedBy: +session.user.id,
          isInitial: false,
          version: nextVersion,
          fileName: upload.fileName,
          blobUrl: upload.blobUrl,
          mimeType: upload.mimeType,
          size: upload.size,
          reviews: {
            create: panelists.map((p) => {
              const prevStatus = prevReviewStatusByPanelist.get(p.userId) as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined
              // First resubmission: all PENDING. Subsequent: APPROVED carries forward, REJECTED -> PENDING
              if (!existingResubmission) return { panelistId: p.userId, status: 'PENDING' as const }
              if (prevStatus === 'APPROVED') return { panelistId: p.userId, status: 'APPROVED' as const }
              // REJECTED or PENDING or missing -> reset to PENDING for next version
              return { panelistId: p.userId, status: 'PENDING' as const }
            }),
          },
        },
      })
    })

    revalidateTag('defense', 'max')

    return {
      success: true,
      message: 'Defense document resubmitted for review.',
      payload: { submissionId: submission.id },
    }
  } catch (error) {
    console.error('[resubmitDefenseDocument | Error]:', error)
    return {
      success: false,
      message: 'Failed to resubmit defense document. Please try again.',
    }
  }
}

// ───────────────────────────── replaceDefenseDocument ─────────────────────────────

/**
 * Replaces the current initial defense document with a new file.
 * Validates: student is in a group with a defense schedule, an initial
 * submission exists, and the uploaded blob is valid. Updates the submission
 * record with the new file and deletes the previous blob from storage.
 */
export async function replaceDefenseDocument(
  upload: DefenseDocumentUpload,
): Promise<{ success: boolean; message: string }> {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  // Find the defense schedule for the student's group.
  const schedule = await prisma.defenseSchedule.findFirst({
    where: {
      deletedAt: null,
      group: {
        deletedAt: null,
        students: {
          some: { userId: +session.user.id, deletedAt: null },
        },
      },
    },
    select: { id: true },
  })
  if (!schedule) {
    return {
      success: false,
      message: 'No defense schedule found for your group.',
    }
  }

  // Find the current initial submission to replace.
  const current = await prisma.defenseSubmission.findFirst({
    where: { scheduleId: schedule.id, isInitial: true, deletedAt: null },
    select: { id: true, blobUrl: true },
  })
  if (!current) {
    return {
      success: false,
      message: 'No initial document to replace.',
    }
  }

  // Verify the client-side upload actually completed.
  const uploadError = await verifyDefenseUpload(schedule.id, upload)
  if (uploadError) return { success: false, message: uploadError }

  try {
    // Update the submission with the new file.
    await prisma.defenseSubmission.update({
      where: { id: current.id },
      data: {
        fileName: upload.fileName,
        blobUrl: upload.blobUrl,
        mimeType: upload.mimeType,
        size: upload.size,
      },
    })

    // Delete the previous blob from storage.
    await del(current.blobUrl)

    revalidateTag('defense', 'max')

    return { success: true, message: 'Defense document replaced.' }
  } catch (error) {
    console.error('[replaceDefenseDocument | Error]:', error)
    return {
      success: false,
      message: 'Failed to replace defense document. Please try again.',
    }
  }
}

// ───────────────────────────── uploadDefenseToken ─────────────────────────────

/**
 * Generates a scoped Vercel Blob client-upload token for a defense document.
 * The token is pinned to one exact pathname under `defense/{scheduleId}/`
 * and cannot be reused for any other path, content type, or size.
 */
export async function uploadDefenseToken(
  fileName: string,
): Promise<{
  success: boolean
  message: string
  payload?: { token: string; pathname: string }
}> {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  if (
    typeof fileName !== 'string' ||
    fileName.length === 0 ||
    fileName.length > 255
  ) {
    return { success: false, message: 'Invalid file name.' }
  }

  // Find the defense schedule for the student's group.
  const schedule = await prisma.defenseSchedule.findFirst({
    where: {
      deletedAt: null,
      group: {
        deletedAt: null,
        students: {
          some: { userId: +session.user.id, deletedAt: null },
        },
      },
    },
    select: { id: true },
  })
  if (!schedule) {
    return {
      success: false,
      message: 'No defense schedule found for your group.',
    }
  }

  const pathname = `defense/${schedule.id}/${sanitizeBlobFilename(fileName)}`

  try {
    const token = await generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: MAX_SIZE_BYTES,
      addRandomSuffix: true,
      // Constrain issued token to private blobs under defense/{scheduleId}/
      // — single Vercel Blob store, per-upload access: private (adviser request).
      // Client `blobPut` will create a private blob via this scoped token.
      access: 'private',
    } as any)
    return { success: true, message: '', payload: { token, pathname } }
  } catch (error) {
    console.error('[uploadDefenseToken | Error]:', error)
    return {
      success: false,
      message: 'Could not start the upload. Please try again.',
    }
  }
}

// ───────────────────────────── Student defense workspace ───────────────

export interface StudentDefenseDetail {
  id: number
  scheduleId: number
  groupId: number
  groupName: string
  sectionName: string
  type: string
  verdict: string
  version: number
  isInitial: boolean
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
  dateSubmitted: string
  submittedBy: string
  status: string
  isCurrent: boolean
  reviewedAt: string | null
}

// Resolves the calling student's live group, mirrors student-review.ts.
async function requireStudentGroup() {
  const session = await requireStudent()
  if (!session?.user?.id) return null
  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    select: {
      id: true,
      group: {
        where: { deletedAt: null },
        select: {
          id: true,
          students: { where: { deletedAt: null }, select: { id: true } },
        },
      },
    },
  })
  if (!student?.group) return null
  const isMember = student.group.students.some((s) => s.id === student.id)
  if (!isMember) return null
  return { groupId: student.group.id, userId: +session.user.id }
}

// Ownership scope for defense submissions: schedule.group must match student's group.
// Includes soft-deleted versions so history remains viewable, mirrors findGroupSubmission.
async function findStudentDefenseSubmission(submissionId: number, groupId: number) {
  return prisma.defenseSubmission.findFirst({
    where: {
      id: submissionId,
      schedule: {
        deletedAt: null,
        group: { id: groupId, deletedAt: null },
      },
    },
    select: { id: true, scheduleId: true },
  })
}

function deriveDefenseSubmissionStatus(
  isInitial: boolean,
  scheduleVerdict: string,
  reviews: { status: string }[],
): string {
  if (isInitial) return scheduleVerdict
  if (reviews.length === 0) return 'In Review'
  if (reviews.every((r) => r.status === 'APPROVED')) return 'Approved'
  if (reviews.some((r) => r.status === 'REJECTED')) return 'Rejected'
  return 'In Review'
}

function toStudentDefenseDetailPayload(
  submission: {
    id: number
    scheduleId: number
    version: number
    isInitial: boolean
    fileName: string
    blobUrl: string
    mimeType: string
    size: number
    createdAt: Date
    deletedAt: Date | null
    schedule: {
      type: string
      verdict: string
      groupId: number
      group: { groupName: string; section: { section: string } }
    }
    user: { name: string }
    reviews: { panelistId: number; status: string; reviewedAt: Date | null }[]
  },
): StudentDefenseDetail {
  const status = deriveDefenseSubmissionStatus(
    submission.isInitial,
    submission.schedule.verdict,
    submission.reviews,
  )
  const myReview = submission.reviews[0] ?? null
  return {
    id: submission.id,
    scheduleId: submission.scheduleId,
    groupId: submission.schedule.groupId,
    groupName: submission.schedule.group.groupName,
    sectionName: submission.schedule.group.section.section,
    type: submission.schedule.type,
    verdict: submission.schedule.verdict,
    version: submission.version,
    isInitial: submission.isInitial,
    fileName: submission.fileName,
    blobUrl: submission.blobUrl,
    mimeType: submission.mimeType,
    size: submission.size,
    dateSubmitted: submission.createdAt.toISOString(),
    submittedBy: submission.user.name,
    status,
    isCurrent: submission.deletedAt == null,
    reviewedAt: myReview?.reviewedAt ? myReview.reviewedAt.toISOString() : null,
  }
}

// Cached detail fetch per-student/per-submission. Session check is outside the
// cached scope so the tag can be keyed by (submissionId, userId) and the cache
// does not capture dynamic headers/cookies.
async function getStudentDefenseDetailData(
  submissionId: number,
  groupId: number,
  userId: number,
): Promise<{ success: boolean; message: string; payload: StudentDefenseDetail | null }> {
  'use cache'
  cacheTag(`defense-student-detail-${submissionId}-${userId}`)
  cacheTag(`defense-submission-${submissionId}-detail`)
  cacheLife('max')

  try {
    const submission = await prisma.defenseSubmission.findFirst({
      where: {
        id: submissionId,
        schedule: {
          deletedAt: null,
          group: { id: groupId, deletedAt: null },
        },
      },
      include: {
        schedule: {
          include: {
            group: { include: { section: { select: { section: true } } } },
          },
        },
        user: { select: { name: true } },
        reviews: {
          where: { deletedAt: null },
          select: { panelistId: true, status: true, reviewedAt: true },
        },
      },
    })
    if (!submission) {
      return { success: false, message: 'Submission not found.', payload: null }
    }
    const payload = toStudentDefenseDetailPayload(submission as never)
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getStudentDefenseDetail | Error]:', error)
    return { success: false, message: 'Failed to load submission.', payload: null }
  }
}

// Single defense submission detail for the student's own group — any version,
// current or superseded. Mirrors getStudentVersionDetail / getVersionDetail.
export async function getStudentDefenseDetail(submissionId: number) {
  const ctx = await requireStudentGroup()
  if (!ctx) return { ...unauthorized, payload: null }
  return getStudentDefenseDetailData(submissionId, ctx.groupId, ctx.userId)
}

// ───────────────────── Student defense annotations (merged) ───────────────

function ensureVisibleFlag(items: unknown[]): unknown[] {
  return items.map((item) => {
    if (!item || typeof item !== 'object') return item
    const obj = item as Record<string, unknown>
    if (!('isVisible' in obj)) return { ...obj, isVisible: true }
    return obj
  })
}

async function getStudentDefenseAnnotationsData(
  submissionId: number,
  groupId: number,
  userId: number,
) {
  'use cache'
  cacheTag(`defense-student-annotations-${submissionId}-${userId}`)
  cacheTag(`defense-submission-${submissionId}-annotations`)
  cacheLife('max')

  try {
    const submission = await findStudentDefenseSubmission(submissionId, groupId)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your group.',
        payload: null,
      }
    }

    const rows = await (prisma as any).defenseSubmissionAnnotation.findMany({
      where: {
        submissionId,
        status: 'COMMITTED',
        deletedAt: null,
      },
      select: { data: true },
    })

    const merged = rows.flatMap((row: { data: unknown }) =>
      Array.isArray(row.data) ? (row.data as unknown[]) : [],
    )
    const data = ensureVisibleFlag(merged)

    return { success: true, message: '', payload: { data } }
  } catch (error) {
    console.error('[getStudentDefenseAnnotations | Error]:', error)
    return {
      success: false,
      message: 'Failed to load annotations.',
      payload: null,
    }
  }
}

// Student READ of COMMITTED annotations for a submission in their group,
// merged across all panelist authors. DRAFT rows are never exposed and only
// COMMITTED rows are flattened. Each annotation carries isVisible (default
// true) so the student CommentsPanel can render the visibility toggle state.
export async function getStudentDefenseAnnotations(submissionId: number) {
  const ctx = await requireStudentGroup()
  if (!ctx) return { ...unauthorized, payload: null }
  return getStudentDefenseAnnotationsData(submissionId, ctx.groupId, ctx.userId)
}

// ───────────────────── Student versions list (defense) ─────────────────────

export interface StudentDefenseVersionItem {
  id: number
  version: number
  isInitial: boolean
  status: string
  submittedAt: string
  isCurrent: boolean
  fileName: string
}

async function getStudentDefenseVersionListData(
  submissionId: number,
  groupId: number,
  userId: number,
) {
  'use cache'
  cacheTag(`defense-student-versions-${submissionId}-${userId}`)
  cacheLife('max')

  try {
    const submission = await findStudentDefenseSubmission(submissionId, groupId)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your group.',
        payload: null,
      }
    }

    const scheduleId = submission.scheduleId

    const chain = await prisma.defenseSubmission.findMany({
      where: { scheduleId },
      orderBy: { version: 'asc' },
      select: {
        id: true,
        version: true,
        isInitial: true,
        fileName: true,
        createdAt: true,
        deletedAt: true,
        schedule: { select: { verdict: true } },
        reviews: {
          where: { deletedAt: null },
          select: { status: true },
        },
      },
    })

    const items: StudentDefenseVersionItem[] = chain.map((row) => ({
      id: row.id,
      version: row.version,
      isInitial: row.isInitial,
      status: deriveDefenseSubmissionStatus(row.isInitial, row.schedule.verdict, row.reviews),
      submittedAt: row.createdAt.toISOString(),
      isCurrent: row.deletedAt == null,
      fileName: row.fileName,
    }))

    return { success: true, message: '', payload: items }
  } catch (error) {
    console.error('[getStudentDefenseVersionList | Error]:', error)
    return { success: false, message: 'Failed to load versions.', payload: null }
  }
}

export async function getStudentDefenseVersionList(submissionId: number) {
  const ctx = await requireStudentGroup()
  if (!ctx) return { ...unauthorized, payload: null }
  return getStudentDefenseVersionListData(submissionId, ctx.groupId, ctx.userId)
}


