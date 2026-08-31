'use server'

import { head, del } from '@vercel/blob'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
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
}

export interface DefensePanelistItem {
  userId: number
  name: string
  email: string
  image: string | null
  role: PanelistRole
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
  panelists: DefensePanelistItem[]
  submissions: DefenseSubmissionItem[]
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
        },
        orderBy: { version: 'asc' },
      },
    },
  })

  if (!schedule) return null

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
    panelists: schedule.panelists.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      email: p.user.email,
      image: p.user.image,
      role: p.role,
    })),
    submissions: schedule.submissions.map((s) => ({
      id: s.id,
      isInitial: s.isInitial,
      version: s.version,
      fileName: s.fileName,
      blobUrl: s.blobUrl,
      mimeType: s.mimeType,
      size: s.size,
      dateSubmitted: s.createdAt.toISOString(),
      submittedByName: s.user.name,
      // Initial submission status = DefenseSchedule.verdict (not from reviews).
      // Resubmission status = derived from DefenseSubmissionReview rows.
      status: s.isInitial
        ? schedule.verdict
        : deriveResubmissionStatus(s.reviews),
      reviews: s.reviews.map((r) => ({
        panelistId: r.panelistId,
        name: r.panelist.name,
        image: r.panelist.image,
        status: r.status,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
      })),
    })),
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
    schedule.verdict !== 'MAJOR_REVISION'
  ) {
    return {
      success: false,
      message: 'Resubmission is only allowed after a revision verdict.',
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
            create: panelists.map((p) => ({
              panelistId: p.userId,
              status: 'PENDING' as const,
            })),
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
    })
    return { success: true, message: '', payload: { token, pathname } }
  } catch (error) {
    console.error('[uploadDefenseToken | Error]:', error)
    return {
      success: false,
      message: 'Could not start the upload. Please try again.',
    }
  }
}
