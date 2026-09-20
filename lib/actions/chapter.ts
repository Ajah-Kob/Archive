'use server'

import { head } from '@vercel/blob'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireStudent, unauthorized } from '@/lib/actions/guard'
import { buildJourneyRows, resolveSectionAvailability } from '@/lib/journey'
import { audit } from '@/lib/actions/audit'
import {
  CHAPTER_LABELS,
  CHAPTER_PHASE,
  type ChapterKey,
  type ChapterSubmissionPayload,
  type ChapterVersionItem,
  type ChapterViewState,
  type SubmissionViewStatus,
} from '@/types/milestones'
import { type AnnotationTransferItem } from '@/lib/annotations-serializer'
import { type PdfAnnotationObject } from '@embedpdf/models'

// Chapter documents are PDF only, up to 20MB (matches the Figma dropzone copy
// and the serverActions body limit + proxy cap in next.config.ts).
const MAX_SIZE_BYTES = 20 * 1024 * 1024

/**
 * A file the CLIENT already uploaded to Vercel Blob via a scoped client token
 * (requestChapterUploadToken). The submission actions verify the blob really
 * exists under this group's chapter path before creating any rows.
 */
export interface ChapterSubmissionUpload {
  blobUrl: string
  fileName: string
  size: number
}

// DB enum (underscore) version of the phase derived from the chapter.
const DB_PHASE: Record<ChapterKey, 'CAPSTONE_1' | 'CAPSTONE_2'> = {
  CHAPTER_1: 'CAPSTONE_1',
  CHAPTER_2: 'CAPSTONE_1',
  CHAPTER_3: 'CAPSTONE_1',
  CHAPTER_4: 'CAPSTONE_2',
  CHAPTER_5: 'CAPSTONE_2',
}

// Revalidates every cache that surfaces a group's chapter progress: each
// member's workspace, the group journey, the coordinator's section views and
// the adviser's evaluation queue. Pass `{ expireNow: true }` to force-expire
// (revalidateTag with { expire: 0 }) instead of stale-while-revalidate, so the
// acting user's next load reflects the change immediately.
function revalidateChapterGroup(
  group: {
    id: number
    sectionId: number
    adviserId: number | null
    students: { userId: number }[]
  },
  opts?: { expireNow?: boolean },
) {
  const config = opts?.expireNow ? ({ expire: 0 } as const) : 'max'
  for (const member of group.students) {
    revalidateTag(`workspace-${member.userId}`, config)
  }
  revalidateTag(`journey-${group.id}`, config)
  revalidateTag(`my-section-${group.sectionId}`, config)
  revalidateTag('my-sections', config)
  revalidateTag('sections', config)
  if (group.adviserId) revalidateTag(`evaluations-${group.adviserId}`, config)
}

// The section's resolved milestone availability (same source of truth as the
// coordinator's management UI).
async function getAvailability(sectionId: number): Promise<Record<string, boolean>> {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, deletedAt: null },
    select: {
      capstone1OpenedAt: true,
      capstone2OpenedAt: true,
      milestoneAvailability: { select: { key: true, openedAt: true } },
    },
  })
  return resolveSectionAvailability(
    section?.capstone1OpenedAt != null,
    section?.capstone2OpenedAt != null,
    section?.milestoneAvailability ?? [],
  )
}

async function getPhaseLocks(sectionId: number): Promise<Record<string, boolean>> {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, deletedAt: null },
    select: { capstone1OpenedAt: true, capstone2OpenedAt: true },
  })
  return {
    'CAPSTONE 1': !section?.capstone1OpenedAt,
    'CAPSTONE 2': !section?.capstone2OpenedAt,
  }
}

// Whether the chapter milestone is open for the group's section.
async function chapterIsOpen(sectionId: number, chapter: ChapterKey) {
  const availability = await getAvailability(sectionId)
  return availability[chapter] ?? false
}

// The current student's live group row (with active members), or null when
// they are not a member of a non-deleted group. The student is derived from
// the session — callers never supply a userId.
async function getStudentGroup(sessionUserId: number) {
  const student = await prisma.student.findFirst({
    where: { userId: sessionUserId, deletedAt: null },
    select: {
      id: true,
      sectionId: true,
      group: {
        where: { deletedAt: null },
        select: {
          id: true,
          sectionId: true,
          adviserId: true,
          students: {
            where: { deletedAt: null },
            select: { id: true, userId: true },
          },
        },
      },
    },
  })
  if (!student?.group) return null
  const isMember = student.group.students.some((s) => s.id === student.id)
  if (!isMember) return null
  return { ...student.group, sectionId: student.sectionId }
}

// Maps a DB submission row to the client version item. `version` is the
// position + 1 within the full chain (mirrors the topic chain derivation).
function toVersionItem(
  row: {
    id: number
    fileName: string
    blobUrl: string
    mimeType: string
    size: number
    status: string
    createdAt: Date
    reviewedAt: Date | null
    reviewNote: string | null
    user: { name: string }
    annotations: { data: any }[]
  },
  index: number,
  isCurrent: boolean,
): ChapterVersionItem {
  const rawStatus = row.status as 'PENDING' | 'NEED_REVISION' | 'APPROVED'
  const status: SubmissionViewStatus =
    rawStatus === 'APPROVED'
      ? 'APPROVED'
      : rawStatus === 'NEED_REVISION'
        ? 'NEEDS_REVISION'
        : 'IN_REVIEW'

  const commentCount = row.annotations.reduce((count, ann) => {
    const items = ann.data as AnnotationTransferItem[]
    return (
      count +
      items.filter((item) => {
        const obj = item.annotation as PdfAnnotationObject
        return obj.contents && obj.contents.trim().length > 0
      }).length
    )
  }, 0)

  return {
    id: row.id,
    version: index + 1,
    fileName: row.fileName,
    blobUrl: row.blobUrl,
    mimeType: row.mimeType,
    size: row.size,
    status,
    submittedBy: row.user.name,
    submittedAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewNote: row.reviewNote,
    isCurrent,
    commentCount,
  }
}

// The full chapter payload for the student view. Reads the group membership,
// the section availability, the lazy-created milestone (when it exists) and
// the version chain. Not 'use cache': the page re-fetches on focus so state
// always reflects the persisted submission + review.
export async function getChapterData(
  chapter: ChapterKey,
): Promise<{ success: boolean; message: string; payload: ChapterSubmissionPayload | null }> {
  const session = await requireStudent()
  if (!session?.user?.id) return { ...unauthorized, payload: null }

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    select: {
      id: true,
      sectionId: true,
      group: {
        where: { deletedAt: null },
        include: {
          students: { where: { deletedAt: null }, select: { id: true } },
          topics: {
            where: { deletedAt: null },
            select: { status: true, deletedAt: true },
          },
          capstone: { select: { topicId: true } },
          milestones: {
            where: { deletedAt: null },
            include: {
              submissions: { select: { status: true, deletedAt: true } },
            },
          },
          capstoneArchive: { select: { deletedAt: true } },
          archivingSubmission: { select: { status: true, deletedAt: true } },
        },
      },
    },
  })

  if (!student) return { ...unauthorized, payload: null }

  const group = student.group ?? null
  const isMember = !!group?.students.some((s) => s.id === student.id)
  const effectiveGroup = isMember ? group : null

  const availability = effectiveGroup
    ? await getAvailability(student.sectionId)
    : resolveSectionAvailability(false, false, [])
  const open = effectiveGroup ? (availability[chapter] ?? false) : false

  const journey = buildJourneyRows(
    effectiveGroup
      ? {
          topics: effectiveGroup.topics,
          capstone: effectiveGroup.capstone,
          milestones: effectiveGroup.milestones.map((m) => ({
            chapter: m.chapter,
            submissions: m.submissions,
          })),
          capstoneArchive: effectiveGroup.capstoneArchive,
          archivingSubmission: (effectiveGroup as unknown as { archivingSubmission?: { status: string; deletedAt: Date | null } | null }).archivingSubmission ?? null,
        }
      : null,
    availability,
  )

  const phaseLocks = effectiveGroup ? await getPhaseLocks(student.sectionId) : { 'CAPSTONE 1': false, 'CAPSTONE 2': false }

  const milestone = effectiveGroup?.milestones.find((m) => m.chapter === chapter) ?? null
  const requiresCapstone = !!effectiveGroup && !effectiveGroup.capstone

  let current: ChapterVersionItem | null = null
  let history: ChapterVersionItem[] = []
  let state: ChapterViewState = 'DEFAULT'
  if (open && milestone) {
    const chain = await prisma.milestoneSubmission.findMany({
      where: { milestoneId: milestone.id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { name: true } },
        annotations: {
          where: { deletedAt: null },
          select: { data: true },
        },
      },
    })
    // Version numbers derive from the ascending chain position (index + 1),
    // but the UI renders the LATEST version first — flip after mapping.
    history = chain.map((row, index) => toVersionItem(row, index, !row.deletedAt)).reverse()
    current = history.find((v) => v.isCurrent) ?? null
    state = !current
      ? 'DEFAULT'
      : current.status === 'APPROVED'
        ? 'APPROVED'
        : current.status === 'NEEDS_REVISION'
          ? 'NEEDS_REVISION'
          : 'IN_REVIEW'
  }

  return {
    success: true,
    message: '',
    payload: {
      chapter: {
        key: chapter,
        label: CHAPTER_LABELS[chapter],
        phase: CHAPTER_PHASE[chapter],
      },
      open,
      milestoneId: milestone?.id ?? null,
      current,
      history,
      state,
      canSubmit: open && !requiresCapstone,
      requiresCapstone,
      journey,
      phaseLocks,
    } as any,
  }
}

// Sanitizes a client-supplied filename for the blob pathname: keeps word
// characters, dot, dash and space; everything else becomes an underscore.
function sanitizeBlobFilename(fileName: string): string {
  const cleaned = fileName.replace(/[^\w.\- ]+/g, '_').trim()
  return cleaned.length > 0 ? cleaned : 'document.pdf'
}

/**
 * Issues a scoped Vercel Blob client-upload token for one chapter file.
 *
 * The full guard chain runs here (student → group member → chapter open →
 * capstone confirmed), and the token is pinned to ONE exact pathname under
 * `chapter/{groupId}/{chapter}/` — it cannot be reused for any other path,
 * content type, or size. The client uploads directly against this token with
 * real progress events, and only then calls submitChapter/resubmitChapter.
 */
export async function requestChapterUploadToken(
  chapter: ChapterKey,
  fileName: string,
): Promise<{
  success: boolean
  message: string
  payload?: { token: string; pathname: string }
}> {
  const session = await requireStudent()
  if (!session?.user?.id) return { ...unauthorized }

  if (typeof fileName !== 'string' || fileName.length === 0 || fileName.length > 255) {
    return { success: false, message: 'Invalid file name.' }
  }

  const auth = await authorizeChapterMutation(chapter, +session.user.id)
  if (auth.ok === false) return auth.result

  const pathname = `chapter/${auth.group.id}/${chapter}/${sanitizeBlobFilename(fileName)}`

  try {
    const token = await generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: MAX_SIZE_BYTES,
      addRandomSuffix: true,
    })
    return { success: true, message: '', payload: { token, pathname } }
  } catch (error) {
    console.error('[requestChapterUploadToken | Error]:', error)
    return { success: false, message: 'Could not start the upload. Please try again.' }
  }
}

// Verifies that the client's upload actually completed before a submission is
// recorded: the blob must exist, live under this group's chapter path, be a
// PDF, and match the claimed size exactly.
async function verifyChapterUpload(
  groupId: number,
  chapter: ChapterKey,
  upload: ChapterSubmissionUpload,
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
  if (!meta.pathname.startsWith(`chapter/${groupId}/${chapter}/`)) {
    return 'The uploaded file does not belong to this chapter.'
  }
  if (meta.contentType !== 'application/pdf') {
    return 'Only PDF files are allowed.'
  }
  if (meta.size !== upload.size) {
    return 'The uploaded file is incomplete. Please upload it again.'
  }
  return null
}

// Shared guard for submit/resubmit: the caller must be a student, a member of
// the group, the chapter must be open, and the group must have an approved
// topic (a Capstone row). Returns the group + milestone (existing or to be
// created) or an error result.
async function authorizeChapterMutation(
  chapter: ChapterKey,
  sessionUserId: number,
): Promise<
  | { ok: true; group: { id: number; sectionId: number; adviserId: number | null; students: { userId: number }[] }; milestoneId: number | null }
  | { ok: false; result: { success: boolean; message: string } }
> {
  const group = await getStudentGroup(sessionUserId)
  if (!group) return { ok: false, result: { success: false, message: 'You are not a member of a group.' } }

  const open = await chapterIsOpen(group.sectionId, chapter)
  if (!open) return { ok: false, result: { success: false, message: 'This chapter is locked.' } }

  const capstone = await prisma.capstone.findFirst({
    where: { groupId: group.id, deletedAt: null },
    select: { id: true },
  })
  if (!capstone) {
    return { ok: false, result: { success: false, message: 'Confirm your capstone topic before submitting.' } }
  }

  const milestone = await prisma.milestone.findFirst({
    where: { groupId: group.id, chapter, deletedAt: null },
    select: { id: true },
  })

  return { ok: true, group, milestoneId: milestone?.id ?? null }
}

// Creates the milestone + submission rows inside a transaction, referencing
// the blob the client already uploaded (verified by verifyChapterSubmission).
// Returns the milestoneId (newly created or existing) so resubmit can target it.
async function persistChapterSubmission(
  groupId: number,
  capstoneId: number,
  phase: 'CAPSTONE_1' | 'CAPSTONE_2',
  chapter: ChapterKey,
  userId: number,
  upload: ChapterSubmissionUpload,
) {
  return prisma.$transaction(async (tx) => {
    const milestone = await tx.milestone.upsert({
      where: { groupId_chapter: { groupId, chapter } },
      update: {},
      create: {
        groupId,
        capstoneId,
        phase,
        chapter,
      },
    })
    const submission = await tx.milestoneSubmission.create({
      data: {
        milestoneId: milestone.id,
        submittedBy: userId,
        fileName: upload.fileName,
        blobUrl: upload.blobUrl,
        mimeType: 'application/pdf',
        size: upload.size,
        status: 'PENDING',
      },
    })
    return { milestoneId: milestone.id, submissionId: submission.id }
  })
}

// First-time submission: creates the milestone row lazily and the first
// PENDING submission. The file must ALREADY be uploaded to Vercel Blob (via
// requestChapterUploadToken + a client-side put); this action verifies that
// upload before recording anything. Guarded so the group cannot have two
// current (live) submissions for the same milestone.
export async function submitChapter(
  chapter: ChapterKey,
  upload: ChapterSubmissionUpload,
): Promise<{ success: boolean; message: string; payload?: { milestoneId: number } }> {
  const session = await requireStudent()
  if (!session?.user?.id) return { ...unauthorized }

  const auth = await authorizeChapterMutation(chapter, +session.user.id)
  if (auth.ok === false) return auth.result

  // The submission is only valid if the client's upload actually completed.
  const uploadError = await verifyChapterUpload(auth.group.id, chapter, upload)
  if (uploadError) return { success: false, message: uploadError }

  try {
    const capstone = await prisma.capstone.findFirst({
      where: { groupId: auth.group.id, deletedAt: null },
      select: { id: true },
    })
    if (!capstone) {
      return { success: false, message: 'Confirm your capstone topic before submitting.' }
    }

    // Guard: only one live (non-soft-deleted) submission may exist for the
    // milestone. The Postgres partial unique index enforces this at the DB
    // level; this check gives a friendly message before the constraint fires.
    if (auth.milestoneId) {
      const existing = await prisma.milestoneSubmission.findFirst({
        where: { milestoneId: auth.milestoneId, deletedAt: null },
        select: { id: true },
      })
      if (existing) {
        return { success: false, message: 'This chapter already has a submission under review.' }
      }
    }

    const { milestoneId, submissionId } = await persistChapterSubmission(
      auth.group.id,
      capstone.id,
      DB_PHASE[chapter],
      chapter,
      +session.user.id,
      upload,
    )

    try {
      await audit({
        action: "CHAPTER_SUBMIT",
        entity: "CHAPTER",
        entityId: String(submissionId ?? milestoneId),
        entityName: CHAPTER_LABELS[chapter],
        before: null,
        after: { chapter, fileName: upload.fileName, blobUrl: upload.blobUrl, size: upload.size, milestoneId, groupId: auth.group.id },
      })
    } catch {}

    await revalidateChapterGroup(auth.group, { expireNow: true })

    return { success: true, message: `${CHAPTER_LABELS[chapter]} submitted for review.`, payload: { milestoneId } }
  } catch (error) {
    console.error('[submitChapter | Error]:', error)
    return { success: false, message: 'Failed to submit the chapter. Please try again.' }
  }
}

// Resubmission after an adviser requested revisions: soft-deletes the current
// submission and creates a new PENDING row so the chain preserves versioning.
// The replacement file must already be uploaded to Vercel Blob (client-side);
// the upload is verified before anything is recorded.
export async function resubmitChapter(
  chapter: ChapterKey,
  upload: ChapterSubmissionUpload,
): Promise<{ success: boolean; message: string; payload?: { milestoneId: number } }> {
  const session = await requireStudent()
  if (!session?.user?.id) return { ...unauthorized }

  const auth = await authorizeChapterMutation(chapter, +session.user.id)
  if (auth.ok === false) return auth.result

  // Resubmission is only valid when the current submission needs revisions.
  if (auth.milestoneId) {
    const current = await prisma.milestoneSubmission.findFirst({
      where: { milestoneId: auth.milestoneId, deletedAt: null },
      select: { status: true },
    })
    if (!current || current.status !== 'NEED_REVISION') {
      return { success: false, message: 'This chapter cannot be resubmitted until the adviser requests revisions.' }
    }
  } else {
    return { success: false, message: 'No submission to resubmit.' }
  }

  // The resubmission is only valid if the client's upload actually completed.
  const uploadError = await verifyChapterUpload(auth.group.id, chapter, upload)
  if (uploadError) return { success: false, message: uploadError }

  try {
    const { milestoneId, newSubmissionId } = await prisma.$transaction(async (tx) => {
      await tx.milestoneSubmission.updateMany({
        where: { milestoneId: auth.milestoneId, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      const created = await tx.milestoneSubmission.create({
        data: {
          milestoneId: auth.milestoneId,
          submittedBy: +session.user.id,
          fileName: upload.fileName,
          blobUrl: upload.blobUrl,
          mimeType: 'application/pdf',
          size: upload.size,
          status: 'PENDING',
        },
      })
      return { milestoneId: auth.milestoneId, newSubmissionId: created.id }
    })

    try {
      await audit({
        action: "CHAPTER_RESUBMIT",
        entity: "CHAPTER",
        entityId: String(newSubmissionId ?? milestoneId),
        entityName: CHAPTER_LABELS[chapter],
        before: { chapter, status: "NEED_REVISION", milestoneId },
        after: { chapter, fileName: upload.fileName, blobUrl: upload.blobUrl, size: upload.size, milestoneId, submissionId: newSubmissionId },
      })
    } catch {}

    await revalidateChapterGroup(auth.group, { expireNow: true })

    return { success: true, message: `${CHAPTER_LABELS[chapter]} resubmitted for review.`, payload: { milestoneId } }
  } catch (error) {
    console.error('[resubmitChapter | Error]:', error)
    return { success: false, message: 'Failed to resubmit the chapter. Please try again.' }
  }
}
