'use server'

import { Prisma, type MilestoneKey } from '@prisma/client'
import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag, updateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { revalidateFeature } from '@/lib/actions/revalidate'
import type { SectionData } from '@/components/sections/main/SectionDataRow'
import type { StudentData } from '@/components/my-sections/students/StudentDataRow'
import { generateJoinCode, getInitials, timeAgo } from '@/lib/helper'
import { requireCoordinator } from '@/lib/actions/guard'
import {
  authorizeSectionAccess,
  requireGlobalSectionManager,
  sectionUnauthorized,
} from '@/lib/actions/sectionAuthorization'
import { audit } from '@/lib/actions/audit'
import {
  buildJourneyRows,
  mapDefenseJourneyInputs,
  resolveSectionAvailability,
} from '@/lib/journey'
import {
  DUPLICATE_SECTION_MESSAGE,
  normalizeSectionKey,
  parseAcademicYear,
  parseGlobalSectionName,
} from '@/lib/sectionValidation'
import { CAPSTONE2_KEYS, keysForPhase } from '@/lib/milestones/phase'
import type { JourneyRow } from '@/types/milestones'

const table = 'section'

const TRANSACTION_MAX_RETRIES = 3
const TRANSACTION_MAX_WAIT_MS = 5_000
const TRANSACTION_TIMEOUT_MS = 10_000
const SECTION_CHANGED_MESSAGE =
  'This section changed since it was loaded. Refresh and try again.'

class SectionBusinessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SectionBusinessError'
  }
}

class TransactionRetriesExhaustedError extends Error {
  constructor() {
    super('Serializable transaction retries exhausted')
    this.name = 'TransactionRetriesExhaustedError'
  }
}

function isPrismaWriteConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  )
}

// The callback is deliberately database-only: audit, cache invalidation, and
// all other non-database side effects run after the transaction commits.
async function withSerializableTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt <= TRANSACTION_MAX_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: TRANSACTION_MAX_WAIT_MS,
        timeout: TRANSACTION_TIMEOUT_MS,
      })
    } catch (error) {
      if (!isPrismaWriteConflict(error)) throw error
      if (attempt === TRANSACTION_MAX_RETRIES) {
        throw new TransactionRetriesExhaustedError()
      }
    }
  }

  throw new TransactionRetriesExhaustedError()
}

function lockSectionRow(tx: Prisma.TransactionClient, sectionId: number) {
  return tx.$queryRaw<{ id: number }[]>`
    SELECT "id"
    FROM "Section"
    WHERE "id" = ${sectionId}
    FOR UPDATE
  `
}

function sectionFailureResponse(
  error: unknown,
  fallbackMessage: string,
  actionName: string,
) {
  if (error instanceof SectionBusinessError) {
    return { success: false, message: error.message }
  }
  if (error instanceof TransactionRetriesExhaustedError) {
    return { success: false, message: SECTION_CHANGED_MESSAGE }
  }

  console.error(`[${actionName} | Error]:`, error)
  return { success: false, message: fallbackMessage }
}

// A student is considered "active now" if they signed in within this window.
const ACTIVE_NOW_MS = 5 * 60 * 1000

function activityStatusFor(loggedInAt: Date | null): 'active' | string {
  if (!loggedInAt) return 'Never'
  if (Date.now() - loggedInAt.getTime() < ACTIVE_NOW_MS) return 'active'
  return timeAgo(loggedInAt)
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
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarGradient: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      },
      students: {
        where: { deletedAt: null },
        select: { id: true, groupId: true },
      },
      groups: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Global row contract (render-safe for assigned + unassigned):
  // - only live sections (deletedAt null); never a coordinator-owned query.
  // - academicYear is always present (staged schema, backfilled 2026-2027).
  // - coordinator is an explicit null when the relation is absent or any link
  //   in the Coordinator → Faculty → User chain is soft-deleted; never an
  //   empty or partial user object.
  // - students counts active students; groups counts distinct active groups
  //   that still have at least one active student (both sides filtered by
  //   deletedAt, so archived students/groups never inflate the counts).
  // - dateCreated keeps the existing en-US display format.
  // Cache contract: this read is tagged 'sections' with life 'max'.
  // Mutations that change sections must immediately expire the same global
  // list via updateTag('sections') + revalidateFeature('sections'), plus the
  // coordinator-scoped caches (updateTag('my-sections') and
  // updateTag(`my-section-${id}`)) so global and coordinator views stay
  // in sync for the acting manager. See revalidateCoordinatorCache() below.
  const payload: SectionData[] = sections.map((s) => {
    const coordinator = s.coordinator
    const faculty = coordinator?.faculty
    const user = faculty?.user
    const activeGroupIds = new Set(s.groups.map((g) => g.id))
    return {
      id: s.id,
      coordinatorId: s.coordinatorId,
      coordinator:
        s.coordinatorId !== null &&
        coordinator &&
        faculty &&
        user &&
        coordinator.deletedAt === null &&
        faculty.deletedAt === null &&
        user.deletedAt === null
          ? {
              id: coordinator.id,
              initials: getInitials(user.name),
              name: user.name,
              email: user.email,
              avatarGradient: user.avatarGradient,
            }
          : null,
      section: s.section,
      academicYear: s.academicYear,
      capstonePhase: s.capstone2OpenedAt ? 'CAPSTONE_2' : 'CAPSTONE_1',
      dateCreated: s.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      students: s.students.length,
      groups: new Set(
        s.students
          .filter((st) => st.groupId && activeGroupIds.has(st.groupId))
          .map((st) => st.groupId),
      ).size,
    }
  })

  return payload
}

export interface SectionGroupProgress {
  id: number
  name: string
  memberCount: number
  adviser: { name: string; email: string; image: string | null } | null
  journey: JourneyRow[]
}

export interface SectionDetailData {
  section: {
    id: number
    name: string
    coordinatorName: string
    studentsCount: number
    groupsCount: number
    capstone2OpenedAt: string | null
  }
  students: StudentData[]
  groups: SectionGroupProgress[]
}

async function getSectionDetailData(id: number) {
  'use cache'
  cacheTag(`section-${id}`)
  cacheLife('max')

  const section = await prisma[table].findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      coordinator: {
        include: {
          faculty: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      },
      students: {
        where: { deletedAt: null },
        orderBy: { user: { name: 'asc' } },
        include: {
          user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarGradient: true,
                loggedInAt: true,
              },
            },
          group: {
            select: {
              id: true,
              groupName: true,
              students: {
                where: { deletedAt: null },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  })

  if (!section) return null

  const students: StudentData[] = section.students.map((s) => ({
    id: s.id,
    userId: s.user.id,
    initials: getInitials(s.user.name),
    name: s.user.name,
    email: s.user.email,
    avatarGradient: s.user.avatarGradient,
    activityStatus: activityStatusFor(s.user.loggedInAt),
    loggedInAt: s.user.loggedInAt,
    group: s.group
      ? {
          name: s.group.groupName,
          members: s.group.students.length,
        }
      : null,
  }))

  return {
    section: {
      id: section.id,
      name: section.section,
      coordinatorName: section.coordinator.faculty.user.name,
      studentsCount: students.length,
      groupsCount: new Set(
        students.filter((s) => s.group).map((s) => s.group!.name),
      ).size,
    },
    students,
  }
}

export async function getSectionById(id: number) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
  }

  try {
    const payload = await getSectionDetailData(id)
    if (!payload) {
      return { success: false, message: 'Section not found', payload: null }
    }
    return { success: true, payload }
  } catch (error) {
    console.error('[getSectionById | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch section',
      payload: null,
    }
  }
}

export async function getSections() {
  // Global-manager-only read: DB-backed via sectionAuthorization (live
  // SUPERADMIN/ADMIN or live isProgramChair). Proxy is never the only guard;
  // ordinary coordinators, students, guests, and faculty receive the standard
  // unauthorized shape. Deleted sections are excluded inside getSectionsData.
  const session = await requireGlobalSectionManager()
  if (!session?.user?.id) {
    return sectionUnauthorized
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

export async function joinSection(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated' }
  }

  // Codes are stored UPPERCASE — normalize input so pasted lowercase works.
  const code = formData.get('code')?.toString().trim().toUpperCase()
  if (!code) {
    return { success: false, message: 'Please enter an invitation code.' }
  }

  return joinSectionWithCode(code)
}

// Shared core behind joinSection and the one-click /join/[code] route. The
// caller supplies only the code; the live session is the sole user identity.
export async function joinSectionWithCode(code: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' }
    }

    const userId = Number(session.user.id)
    if (!Number.isInteger(userId)) {
      return { success: false, message: 'Not authenticated' }
    }

    const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : ''
    if (!normalizedCode) {
      return { success: false, message: 'Please enter an invitation code.' }
    }

    // Resolve the candidate section before entering the transaction. The
    // authoritative Section and JoinCode reads happen again after its row lock.
    const candidate = await prisma.joinCode.findFirst({
      where: {
        code: normalizedCode,
        type: 'STUDENT',
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, section: { select: { id: true } } },
    })
    if (!candidate) {
      return { success: false, message: 'Invalid or expired invitation code.' }
    }
    if (!candidate.section) {
      return { success: false, message: 'No section is linked to this code.' }
    }

    const sectionId = candidate.section.id
    const joined = await withSerializableTransaction(async (tx) => {
      const locked = await lockSectionRow(tx, sectionId)
      if (locked.length !== 1) {
        throw new SectionBusinessError('No section is linked to this code.')
      }

      const now = new Date()
      const liveSection = await tx.section.findFirst({
        where: { id: sectionId, deletedAt: null },
        select: { id: true, section: true },
      })
      if (!liveSection) {
        throw new SectionBusinessError('No section is linked to this code.')
      }

      const liveJoinCode = await tx.joinCode.findFirst({
        where: {
          id: candidate.id,
          code: normalizedCode,
          type: 'STUDENT',
          deletedAt: null,
          expiresAt: { gt: now },
          section: { id: sectionId, deletedAt: null },
        },
        select: { id: true },
      })
      if (!liveJoinCode) {
        throw new SectionBusinessError('Invalid or expired invitation code.')
      }

      const existingStudent = await tx.student.findFirst({
        where: { userId },
        select: { id: true, deletedAt: true },
      })
      if (existingStudent && !existingStudent.deletedAt) {
        throw new SectionBusinessError('You are already enrolled in a section.')
      }

      if (existingStudent) {
        // Student.userId is unique, so resurrect the soft-deleted row instead
        // of attempting a second create for the same user.
        await tx.student.update({
          where: { id: existingStudent.id },
          data: {
            sectionId,
            groupId: null,
            deletedAt: null,
          },
        })
      } else {
        await tx.student.create({
          data: { userId, sectionId },
        })
      }

      await tx.user.update({
        where: { id: userId, deletedAt: null },
        data: { role: 'STUDENT' },
      })

      return {
        sectionId: liveSection.id,
        sectionName: liveSection.section,
        userId,
      }
    })

    try {
      await audit({
        action: 'GROUP_JOIN',
        entity: 'SECTION',
        entityId: String(joined.sectionId),
        entityName: joined.sectionName,
        before: null,
        after: {
          userId: joined.userId,
          sectionId: joined.sectionId,
          section: joined.sectionName,
        },
      })
    } catch {}

    updateTag('users')
    updateTag('sections')
    updateTag('my-sections')
    updateTag(`my-section-${joined.sectionId}`)
    revalidateFeature('sections')

    return { success: true, message: 'Successfully joined the section.' }
  } catch (error) {
    return sectionFailureResponse(
      error,
      'Something went wrong. Please try again.',
      'joinSection',
    )
  }
}

// Legacy compatibility entry point. All manager authorization and archive
// behavior live in archiveSection; this wrapper never performs its own delete.
export async function softDeleteSection(id: string) {
  const targetId = Number(id)
  if (!Number.isInteger(targetId) || targetId < 1) {
    return { success: false, payload: null, message: 'Invalid section id.' }
  }

  return archiveSection(targetId)
}

// ───────────────────────────── Coordinator: My Sections ─────────────────────────────

export interface MySectionCardData {
  id: number
  name: string
  academicYear: string
  students: number
  groups: number
  hasJoinCode: boolean
  joinCode: string | null
  joinCodeExpiresAt: string | null
  dateCreated: string
  capstone2OpenedAt: string | null
  previewAvatars: { initials: string; gradient: string }[]
  headerColor: string | null
}

const JOIN_CODE_TTL_MS = 3 * 24 * 60 * 60 * 1000

function revalidateCoordinatorCache(sectionId?: number) {
  updateTag('my-sections')
  updateTag('sections')
  updateTag('join-code')
  updateTag('faculty')
  updateTag('coordinators')
  revalidateFeature('sections')
  revalidateFeature('faculties')
  if (sectionId) updateTag(`my-section-${sectionId}`)
}

// My Sections scope: only live sections assigned to this coordinator.
// The equality filter on a concrete coordinatorId never matches the staged
// nullable unassigned rows (coordinatorId null), so unassigned global
// sections stay hidden here until a manager assigns them.
async function getCoordinatorSectionsData(coordinatorId: number) {
  'use cache'
  cacheTag('my-sections')
  cacheLife('max')

  const sections = await prisma.section.findMany({
    where: { coordinatorId, deletedAt: null },
    include: {
      students: {
        where: { deletedAt: null },
        select: { id: true, user: { select: { name: true, avatarGradient: true } } },
        orderBy: { user: { name: 'asc' } },
      },
      joinCode: true,
      groups: { where: { deletedAt: null }, select: { id: true } },
    },
    orderBy: { section: 'asc' },
  })

  return sections.map(
    (s): MySectionCardData => {
      const validCode =
        s.joinCode && !s.joinCode.deletedAt ? s.joinCode : null
      return {
        id: s.id,
        name: s.section,
        academicYear: s.academicYear,
        students: s.students.length,
        groups: s.groups.length,
        hasJoinCode: !!validCode,
        joinCode: validCode?.code ?? null,
        joinCodeExpiresAt: validCode?.expiresAt.toISOString() ?? null,
        dateCreated: s.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        capstone2OpenedAt: s.capstone2OpenedAt?.toISOString() ?? null,
        previewAvatars: s.students.slice(0, 3).map((st) => ({
          initials: getInitials(st.user.name),
          gradient: st.user.avatarGradient,
        })),
        headerColor: s.headerColor ?? null,
      }
    },
  )
}

async function getCoordinatorSectionData(sectionId: number) {
  'use cache'
  cacheTag(`my-section-${sectionId}`)
  cacheLife('max')

  const section = await prisma.section.findFirst({
    where: { id: sectionId, deletedAt: null },
    include: {
      joinCode: true,
      milestoneAvailability: { select: { key: true, openedAt: true } },
      _count: { select: { groups: true } },
      students: {
        where: { deletedAt: null },
        orderBy: { user: { name: 'asc' } },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarGradient: true, loggedInAt: true },
          },
          group: {
            select: {
              id: true,
              groupName: true,
              students: {
                where: { deletedAt: null },
                select: { id: true },
              },
            },
          },
        },
      },
      groups: {
        where: { deletedAt: null },
        select: {
          id: true,
          groupName: true,
          leaderStudentId: true,
          adviser: {
            include: {
              faculty: {
                include: {
                  user: {
                    select: { name: true, email: true, image: true },
                  },
                },
              },
            },
          },
          students: {
            where: { deletedAt: null },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          capstone: { select: { topicId: true } },
          milestones: {
            where: { deletedAt: null },
            include: {
              submissions: {
                where: { deletedAt: null },
                select: { status: true, deletedAt: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          defenseSchedules: {
            where: { deletedAt: null },
            select: {
              type: true,
              verdict: true,
              submissions: {
                where: { deletedAt: null },
                orderBy: { version: 'desc' },
                take: 1,
                select: {
                  isInitial: true,
                  reviews: {
                    where: { deletedAt: null },
                    select: { status: true },
                  },
                },
              },
            },
          },
          capstoneArchive: { select: { deletedAt: true } },
          archivingSubmission: { select: { status: true, deletedAt: true } },
        },
      },
    },
  })

  if (!section) return null

  const students: StudentData[] = section.students.map((s) => ({
    id: s.id,
    userId: s.user.id,
    initials: getInitials(s.user.name),
    name: s.user.name,
    email: s.user.email,
    avatarGradient: s.user.avatarGradient,
    activityStatus: activityStatusFor(s.user.loggedInAt),
    loggedInAt: s.user.loggedInAt,
    group: s.group
      ? { name: s.group.groupName, members: s.group.students.length }
      : null,
  }))

  const capstone1Open = !!section.capstone1OpenedAt
  const capstone2Open = !!section.capstone2OpenedAt
  const availability = resolveSectionAvailability(
    capstone1Open,
    capstone2Open,
    section.milestoneAvailability,
  )

  const groups: SectionGroupProgress[] = section.groups.map((g) => {
    return {
      id: g.id,
      name: g.groupName,
      memberCount: g.students.length,
      adviser: g.adviser
        ? {
            name: g.adviser.faculty.user.name,
            email: g.adviser.faculty.user.email,
            image: g.adviser.faculty.user.image,
          }
        : null,
      journey: buildJourneyRows(
        {
          capstone: g.capstone ? { topicId: g.capstone.topicId } : null,
          milestones: g.milestones.map((m) => ({
            chapter: m.chapter,
            submissions: m.submissions,
          })),
          capstoneArchive: g.capstoneArchive,
          archivingSubmission: (g as unknown as { archivingSubmission?: { status: string; deletedAt: Date | null } | null }).archivingSubmission ?? null,
          defenses: mapDefenseJourneyInputs(g.defenseSchedules),
        },
        availability,
      ),
    }
  })

  return {
    section: {
      id: section.id,
      name: section.section,
      hasJoinCode: !!section.joinCode && !section.joinCode.deletedAt,
      joinCode:
        section.joinCode && !section.joinCode.deletedAt
          ? section.joinCode.code
          : null,
      joinCodeExpiresAt: section.joinCode?.expiresAt.toISOString() ?? null,
      dateCreated: section.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      studentsCount: students.length,
      groupsCount: section._count.groups,
      capstone1OpenedAt: section.capstone1OpenedAt?.toISOString() ?? null,
      capstone2OpenedAt: section.capstone2OpenedAt?.toISOString() ?? null,
      headerColor: section.headerColor ?? null,
    },
    students,
    groups,
    milestones: buildMilestoneAvailability(section),
  }
}

// Returns the live coordinator record for the current user, or null.
async function requireCoordinatorRow() {
  const session = await requireCoordinator()
  if (!session) return null
  return prisma.coordinator.findFirst({
    where: {
      faculty: { userId: +session.user.id, deletedAt: null },
      deletedAt: null,
    },
    include: { faculty: { select: { userId: true } } },
  })
}

export async function getCoordinatorSections() {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }
  const payload = await getCoordinatorSectionsData(coordinator.id)
  return { success: true, message: '', payload }
}

export async function getCoordinatorSectionById(id: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  try {
    const section = await prisma.section.findFirst({
      where: {
        id,
        coordinatorId: coordinator.id,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!section) {
      return { success: false, message: 'Section not found', payload: null }
    }

    const payload = await getCoordinatorSectionData(section.id)
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getCoordinatorSectionById | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch section',
      payload: null,
    }
  }
}

// ───────────────────────────── Milestone availability ─────────────────────────────

export interface MilestoneAvailabilityItem {
  key: MilestoneKey
  label: string
  phase: 'CAPSTONE 1' | 'CAPSTONE 2'
  open: boolean
  openedAt: string | null
}

// Chronological order of the milestones a coordinator can manage per section.
// Mirrors the student journey rows (JOURNEY_ROWS in types/milestones.ts).
const MILESTONE_DEFS: ReadonlyArray<{
  key: MilestoneKey
  label: string
  phase: 'CAPSTONE 1' | 'CAPSTONE 2'
}> = [
  { key: 'CHAPTER_1', label: 'Chapter 1', phase: 'CAPSTONE 1' },
  { key: 'CHAPTER_2', label: 'Chapter 2', phase: 'CAPSTONE 1' },
  { key: 'CHAPTER_3', label: 'Chapter 3', phase: 'CAPSTONE 1' },
  { key: 'PROPOSAL_DEFENSE', label: 'Proposal Defense', phase: 'CAPSTONE 1' },
  { key: 'CHAPTER_4', label: 'Chapter 4', phase: 'CAPSTONE 2' },
  { key: 'CHAPTER_5', label: 'Chapter 5', phase: 'CAPSTONE 2' },
  { key: 'FINAL_DEFENSE', label: 'Final Defense', phase: 'CAPSTONE 2' },
  { key: 'ARCHIVING', label: 'Archiving', phase: 'CAPSTONE 2' },
]

// Resolves each milestone's availability for a section. Explicit rows win;
// missing rows fall back to: Capstone 2 milestones following the legacy
// capstone2OpenedAt phase gate, everything else locked. Shares the same
// resolution as the student journey
// (resolveSectionAvailability).
function buildMilestoneAvailability(section: {
  capstone1OpenedAt: Date | null
  capstone2OpenedAt: Date | null
  milestoneAvailability: { key: MilestoneKey; openedAt: Date | null }[]
}): MilestoneAvailabilityItem[] {
  const open = resolveSectionAvailability(
    !!section.capstone1OpenedAt,
    !!section.capstone2OpenedAt,
    section.milestoneAvailability,
  )
  const openedByKey = new Map(
    section.milestoneAvailability.map((r) => [r.key, r.openedAt]),
  )
  return MILESTONE_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    phase: def.phase,
    open: open[def.key] ?? false,
    openedAt: openedByKey.has(def.key)
      ? (openedByKey.get(def.key)?.toISOString() ?? null)
      : null,
  }))
}

// Unlocks or locks a milestone for a section. Locking reopens nothing; an open
// milestone can always be locked again. Capstone 2 changes stay in sync with
// the legacy capstone2OpenedAt gate so existing journey logic keeps working.
export async function setMilestoneAvailability(
  sectionId: number,
  key: MilestoneKey,
  open: boolean,
) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  try {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, coordinatorId: coordinator.id, deletedAt: null },
      select: {
        id: true,
        capstone2OpenedAt: true,
        milestoneAvailability: { select: { key: true, openedAt: true } },
      },
    })
    if (!section) {
      return { success: false, message: 'Section not found.', payload: null }
    }
    if (!MILESTONE_DEFS.some((def) => def.key === key)) {
      return { success: false, message: 'Unknown milestone.', payload: null }
    }

    await prisma.milestoneAvailability.upsert({
      where: { sectionId_key: { sectionId: section.id, key } },
      create: {
        sectionId: section.id,
        key,
        openedAt: open ? new Date() : null,
      },
      update: { openedAt: open ? new Date() : null },
    })

    // Keep the Capstone 2 phase gate aligned with availability.
    if ((CAPSTONE2_KEYS as string[]).includes(key)) {
      const fresh = await prisma.section.findUnique({
        where: { id: section.id },
        select: {
          milestoneAvailability: { select: { key: true, openedAt: true } },
        },
      })
      const anyChapterOpen = (fresh?.milestoneAvailability ?? []).some(
        (r) => (CAPSTONE2_KEYS as string[]).includes(r.key) && !!r.openedAt,
      )
      if (open && !section.capstone2OpenedAt) {
        await prisma.section.update({
          where: { id: section.id },
          data: { capstone2OpenedAt: new Date() },
        })
      } else if (!open && !anyChapterOpen && section.capstone2OpenedAt) {
        await prisma.section.update({
          where: { id: section.id },
          data: { capstone2OpenedAt: null },
        })
      }
    }

    // NOTE: revalidateTag(tag, { expire: 0 }) is used — not updateTag and not
    // revalidateTag(tag, 'max'). updateTag is the read-your-own-writes
    // revalidation API: it guarantees the acting coordinator sees their change
    // but does not reliably invalidate cached data consumed by other users
    // (the students), so their 'use cache' workspace/journey entries stay
    // stale. The 'max' profile is stale-while-revalidate and would keep serving
    // the old locked journey to the next student load. { expire: 0 } force-
    // expires the tags immediately, so every student in the section sees the
    // updated unlock state on their next load.
    revalidateTag(`my-section-${section.id}`, { expire: 0 })
    revalidateTag('my-sections', { expire: 0 })
    revalidateTag('sections', { expire: 0 })

    // Students read availability through their per-user workspace / per-group
    // journey caches — bust every student in the section so the change shows
    // up immediately instead of staying stale until a cache expires.
    const sectionStudents = await prisma.student.findMany({
      where: { sectionId: section.id, deletedAt: null, groupId: { not: null } },
      select: { userId: true, groupId: true },
    })
    for (const s of sectionStudents) {
      if (s.userId) revalidateTag(`workspace-${s.userId}`, { expire: 0 })
      if (s.groupId) revalidateTag(`journey-${s.groupId}`, { expire: 0 })
    }

    return {
      success: true,
      message: open ? 'Milestone unlocked.' : 'Milestone locked.',
      payload: { key, open },
    }
  } catch (error) {
    console.error('[setMilestoneAvailability | Error]:', error)
    return { success: false, message: 'Failed to update milestone.', payload: null }
  }
}

export async function setPhaseAvailability(
  sectionId: number,
  phase: 'CAPSTONE 1' | 'CAPSTONE 2',
  open: boolean,
) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  const keys = keysForPhase(phase)
  if (keys.length === 0) {
    return { success: false, message: 'Unknown phase.', payload: null }
  }

  try {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, coordinatorId: coordinator.id, deletedAt: null },
      select: { id: true, capstone1OpenedAt: true, capstone2OpenedAt: true },
    })
    if (!section) {
      return { success: false, message: 'Section not found.', payload: null }
    }

    const now = new Date()
    // Gate-only: unlocking/locking a phase does NOT bulk-touch milestones.
    // It only flips the section's phase gate (capstone1/2OpenedAt). Individual
    // milestones keep their own availability and are gated by the phase overlay
    // + journey's resolveSectionAvailability hard gate.
    if (phase === 'CAPSTONE 1') {
      if (open && !section.capstone1OpenedAt) {
        await prisma.section.update({
          where: { id: section.id },
          data: { capstone1OpenedAt: now },
        })
      } else if (!open && section.capstone1OpenedAt) {
        await prisma.section.update({
          where: { id: section.id },
          data: { capstone1OpenedAt: null },
        })
      }
    } else {
      if (open && !section.capstone2OpenedAt) {
        await prisma.section.update({
          where: { id: section.id },
          data: { capstone2OpenedAt: now },
        })
      } else if (!open && section.capstone2OpenedAt) {
        await prisma.section.update({
          where: { id: section.id },
          data: { capstone2OpenedAt: null },
        })
      }
    }

    revalidateTag(`my-section-${section.id}`, { expire: 0 })
    revalidateTag('my-sections', { expire: 0 })
    revalidateTag('sections', { expire: 0 })

    const sectionStudents = await prisma.student.findMany({
      where: { sectionId: section.id, deletedAt: null, groupId: { not: null } },
      select: { userId: true, groupId: true },
    })
    for (const s of sectionStudents) {
      if (s.userId) revalidateTag(`workspace-${s.userId}`, { expire: 0 })
      if (s.groupId) revalidateTag(`journey-${s.groupId}`, { expire: 0 })
    }

    return {
      success: true,
      message: open ? `${phase} unlocked.` : `${phase} locked.`,
      payload: { phase, open },
    }
  } catch (error) {
    console.error('[setPhaseAvailability | Error]:', error)
    return { success: false, message: 'Failed to update phase.', payload: null }
  }
}

function parseHeaderColor(raw: unknown): string | null | { error: string } {
  const v = typeof raw === 'string' ? raw.trim() : ''
  if (!v || v === 'default') return null
  if (['0', '1', '2', '3', '4'].includes(v)) return v
  return { error: 'Invalid color selected.' }
}

export interface SectionFormState {
  success: boolean
  message: string
}

// ───────────────────────── Global section creation (Admin/Program Chair) ──
// New sections start unassigned (coordinatorId null) with the purple default
// (headerColor null, the first entry of SECTION_HEADER_PALETTE). Validation
// helpers live in lib/sectionValidation.ts so pure logic can be unit tested.

export async function createSection(
  _prevState: SectionFormState | null,
  formData: FormData,
) {
  // Global-manager-only: DB-backed via sectionAuthorization (live
  // SUPERADMIN/ADMIN or live isProgramChair). Proxy is never the only guard;
  // coordinators, students, guests, and ordinary faculty are denied with the
  // standard shape and never throw.
  const session = await requireGlobalSectionManager()
  if (!session?.user?.id) {
    return sectionUnauthorized
  }

  const nameResult = parseGlobalSectionName(formData.get('name'))
  if (typeof nameResult === 'object' && 'error' in nameResult) {
    return { success: false, message: nameResult.error }
  }
  const name = nameResult as string

  const yearResult = parseAcademicYear(formData.get('academicYear'))
  if (typeof yearResult === 'object' && 'error' in yearResult) {
    return { success: false, message: yearResult.error }
  }
  const academicYear = yearResult as string

  // Client-supplied coordinator/header-color are intentionally ignored: every
  // global create starts unassigned (coordinatorId null) with the purple
  // default (headerColor null). No invitation or notification is created.

  try {
    // Active-only duplicate preflight per academic year across all
    // coordinators. The DB expression index is the final backstop; the app
    // surfaces the exact copy without leaking internals.
    const siblings = await prisma.section.findMany({
      where: { academicYear },
      select: { id: true, section: true, deletedAt: true, joinCodeId: true },
    })
    const targetKey = normalizeSectionKey(name)
    const activeDuplicate = siblings.find(
      (s) => !s.deletedAt && normalizeSectionKey(s.section) === targetKey,
    )
    if (activeDuplicate) {
      return { success: false, message: DUPLICATE_SECTION_MESSAGE }
    }
    // Reuse the most recent archived/deleted match so its name stays reusable
    // under the active-only constraint.
    const archived =
      siblings
        .filter(
          (s) => s.deletedAt && normalizeSectionKey(s.section) === targetKey,
        )
        .sort((a, b) => b.id - a.id)[0] ?? null

    const code = generateJoinCode()
    const expiresAt = new Date(Date.now() + JOIN_CODE_TTL_MS)

    let createdSectionId: number | null = null
    let createdSectionBefore: unknown = null

    if (archived) {
      // Revive the archived row unassigned with a fresh STUDENT join code.
      // Only the join code is cleaned up; students/groups are untouched.
      if (archived.joinCodeId) {
        await prisma.joinCode.update({
          where: { id: archived.joinCodeId },
          data: { deletedAt: new Date() },
        })
      }
      const joinCode = await prisma.joinCode.create({
        data: { code, type: 'STUDENT', expiresAt },
      })
      await prisma.section.update({
        where: { id: archived.id },
        data: {
          section: name,
          academicYear,
          coordinatorId: null,
          headerColor: null,
          joinCodeId: joinCode.id,
          deletedAt: null,
        },
      })
      createdSectionId = archived.id
      createdSectionBefore = {
        section: archived.section,
        academicYear,
        deletedAt: archived.deletedAt,
      }
    } else {
      const joinCode = await prisma.joinCode.create({
        data: { code, type: 'STUDENT', expiresAt },
      })
      const created = await prisma.section.create({
        data: {
          section: name,
          academicYear,
          coordinatorId: null,
          headerColor: null,
          joinCodeId: joinCode.id,
        },
      })
      createdSectionId = created.id
      createdSectionBefore = null
    }

    try {
      await audit({
        action: "SECTION_CREATE",
        entity: "SECTION",
        entityId: String(createdSectionId),
        entityName: name,
        before: createdSectionBefore,
        after: {
          section: name,
          academicYear,
          coordinatorId: null,
          headerColor: null,
        },
      })
    } catch {}

    revalidateCoordinatorCache(createdSectionId ?? undefined)
    return { success: true, message: `Section ${name} created successfully.` }
  } catch (error) {
    // Race backstop: a concurrent insert that passes preflight still hits the
    // active-only DB index. Surface the exact copy instead of internals.
    if ((error as { code?: string })?.code === 'P2002') {
      return { success: false, message: DUPLICATE_SECTION_MESSAGE }
    }
    console.error('[createSection | Error]:', error)
    return { success: false, message: 'Failed to create section.' }
  }
}

// ────────────────── Role-scoped section update (Global / Coordinator) ──
// Single capability-aware edit action consumed by both modal variants:
// the global-edit form submits name + academicYear while the coordinator
// form submits name + headerColor (academic year rendered read-only). The
// role policy is enforced server-side from live DB rows, so fields outside
// the caller's capability are ignored — a crafted hidden input can never
// escalate (a coordinator cannot change academicYear/coordinatorId, and a
// global manager cannot change headerColor/coordinatorId).
//
// Contract (FormData):
// - sectionId (required): numeric id of a live section.
// - name (required): trimmed/whitespace-collapsed display value, 3-60 chars.
// - academicYear (global managers only): required `YYYY-YYYY` inside the
//   supported window; ignored for coordinators.
// - headerColor (assigned coordinators only): palette key or default/empty
//   for purple; ignored for global managers.
//
// Authorization is DB-backed via authorizeSectionAccess (proxy is never the
// only guard): global-manager = live SUPERADMIN/ADMIN or live isProgramChair
// (any live section, including unassigned); assigned-coordinator = a live
// coordinator row owning this live assigned section. Everyone else —
// unrelated coordinators, coordinators on unassigned sections, students,
// guests, advisers, ordinary faculty, deleted chains — receives the standard
// unauthorized shape (null also covers not-found/archived, so existence is
// never leaked). Active-name uniqueness is global per academic year on the
// normalized key (trim + collapse + lowercase, matching the staged DB
// backstop); archived/deleted names stay reusable.
export async function updateSection(
  _prevState: SectionFormState | null,
  formData: FormData,
) {
  const sectionId = parseInt(formData.get('sectionId')?.toString() ?? '')
  if (Number.isNaN(sectionId)) {
    return { success: false, message: 'Invalid section.' }
  }

  const nameResult = parseGlobalSectionName(formData.get('name'))
  if (typeof nameResult === 'object' && 'error' in nameResult) {
    return { success: false, message: nameResult.error }
  }
  const name = nameResult as string

  // Re-checks the section and the caller from live database rows inside the
  // action (deleted rows filtered); proxy JWTs are never trusted here.
  const access = await authorizeSectionAccess(sectionId)
  if (!access) {
    return sectionUnauthorized
  }

  // ── Global manager: name + academic year; headerColor/coordinatorId ignored.
  if (access.kind === 'global-manager') {
    const yearResult = parseAcademicYear(formData.get('academicYear'))
    if (typeof yearResult === 'object' && 'error' in yearResult) {
      return { success: false, message: yearResult.error }
    }
    const academicYear = yearResult as string

    try {
      const current = await prisma[table].findFirst({
        where: { id: access.sectionId, deletedAt: null },
      })
      if (!current) {
        return sectionUnauthorized
      }

      if (current.section === name && current.academicYear === academicYear) {
        return { success: true, message: 'No changes to save.' }
      }

      // Active-only duplicate preflight per academic year across all
      // coordinators; the DB expression index is the final race backstop.
      const siblings = await prisma[table].findMany({
        where: { academicYear, deletedAt: null },
        select: { id: true, section: true },
      })
      const targetKey = normalizeSectionKey(name)
      const activeDuplicate = siblings.find(
        (s) => s.id !== current.id && normalizeSectionKey(s.section) === targetKey,
      )
      if (activeDuplicate) {
        return { success: false, message: DUPLICATE_SECTION_MESSAGE }
      }

      await prisma[table].update({
        where: { id: current.id },
        data: { section: name, academicYear },
      })

      try {
        await audit({
          action: "SECTION_UPDATE",
          entity: "SECTION",
          entityId: String(current.id),
          entityName: name,
          before: { section: current.section, academicYear: current.academicYear },
          after: { section: name, academicYear },
        })
      } catch {}
      revalidateCoordinatorCache(current.id)
      return { success: true, message: `Section renamed to ${name}.` }
    } catch (error) {
      // A concurrent insert/update that passes preflight still hits the
      // active-only DB index — surface the exact copy, never internals.
      if ((error as { code?: string })?.code === 'P2002') {
        return { success: false, message: DUPLICATE_SECTION_MESSAGE }
      }
      console.error('[updateSection | Error]:', error)
      return { success: false, message: 'Failed to update section.' }
    }
  }

  // ── Assigned coordinator: name + header color; academicYear is read-only
  // and coordinatorId can never be assigned through this form.
  const headerColorRaw = parseHeaderColor(formData.get('headerColor'))
  if (headerColorRaw && typeof headerColorRaw === 'object' && 'error' in headerColorRaw) {
    return { success: false, message: headerColorRaw.error }
  }
  const headerColor = headerColorRaw as string | null

  try {
    const current = await prisma[table].findFirst({
      where: { id: access.sectionId, deletedAt: null },
    })
    if (!current) {
      return sectionUnauthorized
    }

    const nameChanged = current.section !== name
    const currentColor = current.headerColor ?? null
    const colorChanged = currentColor !== headerColor

    if (!nameChanged && !colorChanged) {
      return { success: true, message: 'No changes to save.' }
    }

    // Color-only change (name stays the same, same academic year).
    if (!nameChanged && colorChanged) {
      await prisma[table].update({
        where: { id: current.id },
        data: { headerColor },
      })
      try {
        await audit({
          action: "SECTION_UPDATE",
          entity: "SECTION",
          entityId: String(current.id),
          entityName: current.section,
          before: { section: current.section, headerColor: currentColor },
          after: { section: name, headerColor },
        })
      } catch {}
      revalidateCoordinatorCache(current.id)
      return { success: true, message: 'Section updated.' }
    }

    // Name change: active-only duplicate preflight within the section's own
    // academic year across all coordinators. Archived/deleted names are
    // reusable — no student/group transfer, no row swap.
    const siblings = await prisma[table].findMany({
      where: { academicYear: current.academicYear, deletedAt: null },
      select: { id: true, section: true },
    })
    const targetKey = normalizeSectionKey(name)
    const activeDuplicate = siblings.find(
      (s) => s.id !== current.id && normalizeSectionKey(s.section) === targetKey,
    )
    if (activeDuplicate) {
      return { success: false, message: DUPLICATE_SECTION_MESSAGE }
    }

    await prisma[table].update({
      where: { id: current.id },
      data: { section: name, headerColor },
    })
    try {
      await audit({
        action: "SECTION_UPDATE",
        entity: "SECTION",
        entityId: String(current.id),
        entityName: name,
        before: { section: current.section, headerColor: currentColor },
        after: { section: name, headerColor },
      })
    } catch {}

    revalidateCoordinatorCache(current.id)
    return { success: true, message: `Section renamed to ${name}.` }
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      return { success: false, message: DUPLICATE_SECTION_MESSAGE }
    }
    console.error('[updateSection | Error]:', error)
    return { success: false, message: 'Failed to update section.' }
  }
}

// ────────────────── Manager-only section archive ──
// Global-manager-only soft-delete consumed by the neutral archive confirmation
// modal (ArchiveSectionModal calls archiveSection(section.id)).
// The lock, live checks, counts, and the Section/linked join-code soft-deletes
// share one Serializable transaction. Audit and cache invalidation happen only
// after that transaction commits, so a retried attempt cannot duplicate either
// side effect.
export async function archiveSection(id: number) {
  const session = await requireGlobalSectionManager()
  if (!session?.user?.id) {
    return sectionUnauthorized
  }
  if (!Number.isInteger(id)) {
    return { success: false, message: 'Invalid section.' }
  }

  try {
    const archived = await withSerializableTransaction(async (tx) => {
      const locked = await lockSectionRow(tx, id)
      if (locked.length !== 1) {
        throw new SectionBusinessError('Section not found.')
      }

      const section = await tx.section.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, section: true, joinCodeId: true },
      })
      if (!section) {
        throw new SectionBusinessError('Section not found.')
      }

      const studentCount = await tx.student.count({
        where: { sectionId: section.id, deletedAt: null },
      })
      const groupCount = await tx.group.count({
        where: { sectionId: section.id, deletedAt: null },
      })
      if (studentCount > 0 || groupCount > 0) {
        throw new SectionBusinessError(
          'Only empty sections can be archived. Move or remove students and groups first.',
        )
      }

      const archivedAt = new Date()
      if (section.joinCodeId !== null) {
        await tx.joinCode.updateMany({
          where: { id: section.joinCodeId, deletedAt: null },
          data: { deletedAt: archivedAt },
        })
      }

      const updated = await tx.section.updateMany({
        where: { id: section.id, deletedAt: null },
        data: { deletedAt: archivedAt },
      })
      if (updated.count !== 1) {
        throw new SectionBusinessError(SECTION_CHANGED_MESSAGE)
      }

      return { section, archivedAt }
    })

    try {
      await audit({
        action: 'SECTION_ARCHIVE',
        entity: 'SECTION',
        entityId: String(archived.section.id),
        entityName: archived.section.section,
        before: { section: archived.section.section, deletedAt: null },
        after: {
          section: archived.section.section,
          deletedAt: archived.archivedAt.toISOString(),
        },
      })
    } catch {}

    revalidateCoordinatorCache(archived.section.id)
    return { success: true, message: `Section ${archived.section.section} archived.` }
  } catch (error) {
    return sectionFailureResponse(
      error,
      'Failed to archive section.',
      'archiveSection',
    )
  }
}

// ────────────────── Manager-only one-time coordinator assignment ──
// Direct assignment consumed by the unassigned-row modal
// (AssignCoordinatorModal calls assignSectionCoordinator(sectionId,
// coordinatorId) with numeric ids, then toasts/closes/refreshes).
// DB-backed via requireGlobalSectionManager (live SUPERADMIN/ADMIN or live
// isProgramChair); proxy is never the only guard. Assigned coordinators,
// unrelated coordinators, students, guests, advisers, and ordinary faculty
// receive sectionUnauthorized. Staged schema: Section.coordinatorId is
// nullable, so unassigned means coordinatorId null; academicYear is required
// but untouched here. Succeeds only when the live section is unassigned — an
// already-assigned section is rejected. Assigned-row changes use the separate
// reassignSectionCoordinator() action below; this entry point never
// overwrites an assigned row or unassigns it.
// Both ids are re-checked from live rows inside the action (deletedAt null on
// Section, and the full Coordinator → Faculty → User chain live); unrelated
// or deleted records are rejected before any write. The write itself is
// race-safe: updateMany guarded by coordinatorId null, so a concurrent assign
// that wins first turns this call into the already-assigned refusal instead
// of an overwrite. Never creates an Invitation or Notification — this is a
// direct link, not the faculty invitation flow. Success revalidates global
// sections, coordinator workload/faculty data, and the assigned coordinator's
// My Sections caches. Never exposes raw DB errors; all failures return the
// standard { success, message } shape.
export async function assignSectionCoordinator(
  sectionId: number,
  coordinatorId: number,
) {
  const session = await requireGlobalSectionManager()
  if (!session?.user?.id) {
    return sectionUnauthorized
  }
  if (!Number.isInteger(sectionId)) {
    return { success: false, message: 'Invalid section.' }
  }
  if (!Number.isInteger(coordinatorId)) {
    return { success: false, message: 'Invalid coordinator.' }
  }

  try {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, deletedAt: null },
      select: { id: true, section: true, coordinatorId: true },
    })
    if (!section) {
      return { success: false, message: 'Section not found.' }
    }
    if (section.coordinatorId !== null) {
      return {
        success: false,
        message: 'This section already has a coordinator.',
      }
    }

    const coordinator = await prisma.coordinator.findFirst({
      where: {
        id: coordinatorId,
        deletedAt: null,
        faculty: {
          deletedAt: null,
          user: { deletedAt: null },
        },
      },
      select: { id: true },
    })
    if (!coordinator) {
      return { success: false, message: 'Coordinator not found.' }
    }

    // Idempotency/race guard: only an unassigned live row can be linked.
    const updated = await prisma.section.updateMany({
      where: { id: section.id, coordinatorId: null, deletedAt: null },
      data: { coordinatorId: coordinator.id },
    })
    if (updated.count === 0) {
      return {
        success: false,
        message: 'This section already has a coordinator.',
      }
    }

    revalidateCoordinatorCache(section.id)

    return {
      success: true,
      message: `Coordinator assigned to ${section.section} successfully.`,
      payload: { sectionId: section.id, coordinatorId: coordinator.id },
    }
  } catch (error) {
    console.error('[assignSectionCoordinator | Error]:', error)
    return { success: false, message: 'Failed to assign coordinator.' }
  }
}

// ────────────────── Manager-only coordinator reassignment ──
// DB-backed via requireGlobalSectionManager (live SUPERADMIN/ADMIN or live
// Program Chair); proxy is never the only guard. Reassignment is available
// only for an assigned live section and requires the caller to submit the
// coordinator id it observed. The expected id is checked again in the atomic
// update, so a concurrent manager change cannot be overwritten. There is
// intentionally no unassign path here.
export async function reassignSectionCoordinator(
  sectionId: number,
  nextCoordinatorId: number,
  expectedCoordinatorId: number,
) {
  const session = await requireGlobalSectionManager()
  if (!session?.user?.id) {
    return sectionUnauthorized
  }
  if (!Number.isInteger(sectionId)) {
    return { success: false, message: 'Invalid section.' }
  }
  if (!Number.isInteger(nextCoordinatorId)) {
    return { success: false, message: 'Invalid coordinator.' }
  }
  if (!Number.isInteger(expectedCoordinatorId)) {
    return { success: false, message: 'Invalid expected coordinator.' }
  }

  try {
    // These reads are independent after authorization and input validation.
    const [section, coordinator] = await Promise.all([
      prisma.section.findFirst({
        where: { id: sectionId, deletedAt: null },
        select: { id: true, section: true, coordinatorId: true },
      }),
      prisma.coordinator.findFirst({
        where: {
          id: nextCoordinatorId,
          deletedAt: null,
          faculty: {
            deletedAt: null,
            user: { deletedAt: null },
          },
        },
        select: {
          id: true,
          deletedAt: true,
          faculty: {
            select: {
              id: true,
              deletedAt: true,
              user: {
                select: { id: true, deletedAt: true },
              },
            },
          },
        },
      }),
    ])

    if (!section) {
      return { success: false, message: 'Section not found.' }
    }
    if (section.coordinatorId === null) {
      return {
        success: false,
        message: 'This section is unassigned and cannot be reassigned.',
      }
    }
    if (section.coordinatorId !== expectedCoordinatorId) {
      return {
        success: false,
        message: 'This section changed since it was loaded. Refresh and try again.',
      }
    }
    if (nextCoordinatorId === section.coordinatorId) {
      return { success: false, message: 'Choose a different coordinator.' }
    }
    if (
      !coordinator ||
      coordinator.deletedAt !== null ||
      !coordinator.faculty ||
      coordinator.faculty.deletedAt !== null ||
      !coordinator.faculty.user ||
      coordinator.faculty.user.deletedAt !== null
    ) {
      return { success: false, message: 'Coordinator not found or inactive.' }
    }

    const updated = await prisma.section.updateMany({
      where: {
        id: sectionId,
        deletedAt: null,
        coordinatorId: expectedCoordinatorId,
      },
      data: { coordinatorId: coordinator.id },
    })
    if (updated.count === 0) {
      return {
        success: false,
        message: 'This section changed since it was loaded. Refresh and try again.',
      }
    }

    try {
      await audit({
        action: 'SECTION_COORDINATOR_REASSIGN',
        entity: 'SECTION',
        entityId: String(section.id),
        entityName: section.section,
        before: { coordinatorId: expectedCoordinatorId },
        after: { coordinatorId: nextCoordinatorId },
      })
    } catch {}

    revalidateCoordinatorCache(section.id)

    return {
      success: true,
      message: `Coordinator reassigned for ${section.section} successfully.`,
      payload: { sectionId: section.id, coordinatorId: coordinator.id },
    }
  } catch (error) {
    console.error('[reassignSectionCoordinator | Error]:', error)
    return { success: false, message: 'Failed to reassign coordinator.' }
  }
}

export async function removeStudentFromSection(studentId: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  try {
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        deletedAt: null,
        section: { coordinatorId: coordinator.id, deletedAt: null },
      },
    })
    if (!student) {
      return { success: false, message: 'Student not found in your section.' }
    }

    const groupId = student.groupId
    await prisma.$transaction([
      prisma.student.update({
        where: { id: student.id },
        data: { groupId: null, deletedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: student.userId },
        data: { role: 'GUEST' },
      }),
    ])

    // Business rule: a group cannot exist without a student.
    if (groupId) {
      const remaining = await prisma.student.findMany({
        where: { groupId, deletedAt: null },
        orderBy: { id: 'asc' },
        select: { id: true },
      })
      if (remaining.length === 0) {
        await prisma.group.update({
          where: { id: groupId },
          data: { deletedAt: new Date(), leaderStudentId: null },
        })
      } else {
        // If the removed student led the group, auto-transfer leadership to
        // the earliest remaining member (lowest Student.id).
        const group = await prisma.group.findFirst({
          where: { id: groupId },
          select: { leaderStudentId: true },
        })
        if (
          group &&
          (group.leaderStudentId === null || group.leaderStudentId === student.id)
        ) {
          await prisma.group.update({
            where: { id: groupId },
            data: { leaderStudentId: remaining[0].id },
          })
        }
      }
    }

    revalidateCoordinatorCache(student.sectionId)
    revalidateTag('users', 'max')
    revalidateFeature('users')
    revalidateTag(`workspace-${student.userId}`, 'max')
    revalidateTag(`classmates-${student.userId}`, 'max')
    if (groupId) revalidateTag(`journey-${groupId}`, 'max')
    return { success: true, message: 'Student removed from the section.' }
  } catch (error) {
    console.error('[removeStudentFromSection | Error]:', error)
    return { success: false, message: 'Failed to remove student.' }
  }
}

export async function removeStudentsFromSection(studentIds: number[]) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  const ids = [...new Set(studentIds.filter((id) => Number.isInteger(id)))]
  if (ids.length === 0) {
    return { success: false, message: 'Select at least one student to remove.' }
  }

  try {
    const students = await prisma.student.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        section: { coordinatorId: coordinator.id, deletedAt: null },
      },
      select: { id: true, userId: true, groupId: true, sectionId: true },
    })
    if (students.length !== ids.length) {
      return { success: false, message: 'Some students were not found in your sections. Nothing was removed.' }
    }

    const removedIds = new Set(students.map((s) => s.id))
    const groupIds = [...new Set(students.map((s) => s.groupId).filter((g): g is number => g != null))]
    const sectionIds = [...new Set(students.map((s) => s.sectionId))]
    const userIds = students.map((s) => s.userId)

    await prisma.$transaction([
      ...students.map((s) =>
        prisma.student.update({
          where: { id: s.id },
          data: { groupId: null, deletedAt: new Date() },
        }),
      ),
      ...userIds.map((userId) =>
        prisma.user.update({ where: { id: userId }, data: { role: 'GUEST' } }),
      ),
    ])

    for (const groupId of groupIds) {
      const remaining = await prisma.student.findMany({
        where: { groupId, deletedAt: null },
        orderBy: { id: 'asc' },
        select: { id: true },
      })
      if (remaining.length === 0) {
        await prisma.group.update({
          where: { id: groupId },
          data: { deletedAt: new Date(), leaderStudentId: null },
        })
      } else {
        const group = await prisma.group.findFirst({
          where: { id: groupId },
          select: { leaderStudentId: true },
        })
        if (group && (group.leaderStudentId == null || removedIds.has(group.leaderStudentId))) {
          await prisma.group.update({
            where: { id: groupId },
            data: { leaderStudentId: remaining[0].id },
          })
        }
      }
    }

    for (const sectionId of sectionIds) revalidateCoordinatorCache(sectionId)
    revalidateTag('users', 'max')
    revalidateFeature('users')
    for (const userId of userIds) {
      revalidateTag(`workspace-${userId}`, 'max')
      revalidateTag(`classmates-${userId}`, 'max')
    }
    for (const groupId of groupIds) revalidateTag(`journey-${groupId}`, 'max')
    const count = students.length
    return { success: true, message: count === 1 ? 'Student removed from the section.' : `${count} students removed from the section.` }
  } catch (error) {
    console.error('[removeStudentsFromSection | Error]:', error)
    return { success: false, message: 'Failed to remove students.' }
  }
}

export async function copySectionJoinCode(sectionId: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  try {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, coordinatorId: coordinator.id, deletedAt: null },
      include: { joinCode: true },
    })
    if (!section) {
      return { success: false, message: 'Section not found.', payload: null }
    }

    let joinCode = section.joinCode
    let regenerated = false

    if (!joinCode || joinCode.deletedAt || joinCode.expiresAt < new Date()) {
      if (joinCode) {
        await prisma.joinCode.update({
          where: { id: joinCode.id },
          data: { deletedAt: new Date() },
        })
      }
      joinCode = await prisma.joinCode.create({
        data: {
          code: generateJoinCode(),
          type: 'STUDENT',
          expiresAt: new Date(Date.now() + JOIN_CODE_TTL_MS),
        },
      })
      await prisma.section.update({
        where: { id: section.id },
        data: { joinCodeId: joinCode.id },
      })
      regenerated = true
      revalidateCoordinatorCache(section.id)
    }

    return {
      success: true,
      message: regenerated ? 'New code generated.' : 'Code is valid.',
      payload: { code: joinCode.code, regenerated },
    }
  } catch (error) {
    console.error('[copySectionJoinCode | Error]:', error)
    return { success: false, message: 'Failed to get invitation code.', payload: null }
  }
}

export interface SectionGroupMember {
  id: number
  name: string
  email: string
  image: string | null
  isLeader: boolean
}

export interface SectionGroupTopic {
  id: number
  title: string
  status: 'PENDING' | 'APPROVED' | 'NEED_REVISION'
  note: string | null
  submittedBy: string
  createdAt: string
}

export interface ChapterSubmissionBrief {
  id: number
  version: number
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
  status: string
  createdAt: string
  comments: number
  pages: number
}

export interface SectionGroupChapter {
  chapter: string
  label: string
  status: 'LOCKED' | 'DEFAULT' | 'SUBMITTED' | 'NEEDS_REVISION' | 'APPROVED'
  submissions: ChapterSubmissionBrief[]
}

export interface SectionGroupDefense {
  id: number
  type: 'PROPOSAL' | 'FINAL'
  date: string
  venue: string
  verdict: string
}

export interface SectionGroupArchiving {
  status: string | null
  title: string | null
  fileName: string | null
  blobUrl: string | null
}

export interface SectionGroupDetail {
  id: number
  name: string
  capstone2OpenedAt: string | null
  members: SectionGroupMember[]
  adviser: { name: string; email: string; image: string | null } | null
  topic: SectionGroupTopic | null
  journey: JourneyRow[]
  chapters: SectionGroupChapter[]
  defenses: SectionGroupDefense[]
  archiving: SectionGroupArchiving | null
}

// Live per-group detail for the coordinator progress drawer. Not 'use cache':
// the drawer fetches on open so it never shows stale data.
export async function getCoordinatorGroupDetail(groupId: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return {
      success: false,
      message: 'You are not authorized to perform this action.',
      payload: null,
    }
  }

  try {
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        deletedAt: null,
        section: { coordinatorId: coordinator.id, deletedAt: null },
      },
      include: {
        section: {
          select: {
            capstone1OpenedAt: true,
            capstone2OpenedAt: true,
            milestoneAvailability: { select: { key: true, openedAt: true } },
          },
        },
        students: {
          where: { deletedAt: null },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        adviser: {
          include: {
            faculty: {
              include: {
                user: { select: { name: true, email: true, image: true } },
              },
            },
          },
        },
        topics: {
          where: { deletedAt: null },
          select: { status: true, deletedAt: true },
          orderBy: { createdAt: 'desc' },
        },
        capstone: {
          include: {
            topic: {
              include: {
                uploadedBy: { include: { user: { select: { name: true } } } },
              },
            },
          },
        },
        milestones: {
          where: { deletedAt: null },
          include: {
            submissions: {
              include: {
                user: { select: { name: true } },
                annotations: {
                  where: { deletedAt: null },
                  select: { data: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        capstoneArchive: { select: { deletedAt: true } },
        archivingSubmission: { select: { status: true, deletedAt: true, title: true, fileName: true, blobUrl: true, mimeType: true, size: true } },
        defenseSchedules: {
          where: { deletedAt: null },
          select: {
            id: true,
            type: true,
            date: true,
            venue: true,
            verdict: true,
            startTime: true,
            endTime: true,
            submissions: {
              where: { deletedAt: null },
              orderBy: { version: 'desc' },
              take: 1,
              select: {
                isInitial: true,
                reviews: {
                  where: { deletedAt: null },
                  select: { status: true },
                },
              },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    })
    if (!group) {
      return {
        success: false,
        message: 'Group not found in your sections.',
        payload: null,
      }
    }

    const journey = buildJourneyRows(
      {
        capstone: group.capstone ? { topicId: group.capstone.topicId } : null,
        milestones: group.milestones.map((m) => ({
          chapter: m.chapter,
          submissions: m.submissions,
        })),
        capstoneArchive: group.capstoneArchive,
        archivingSubmission: (group as unknown as { archivingSubmission?: { status: string; deletedAt: Date | null } | null }).archivingSubmission ?? null,
        defenses: mapDefenseJourneyInputs(group.defenseSchedules),
      },
      resolveSectionAvailability(
        !!(group.section as unknown as { capstone1OpenedAt: Date | null }).capstone1OpenedAt,
        !!group.section.capstone2OpenedAt,
        group.section.milestoneAvailability,
      ),
    )

    const chapters: SectionGroupChapter[] = journey
      .filter((r) => r.slug.startsWith('chapter-'))
      .map((row) => {
        const chapKey = row.slug.toUpperCase().replace('-', '_') as string
        const milestone = (group as unknown as { milestones: Array<{ chapter: string; submissions: Array<{ id: number; fileName: string; blobUrl: string; mimeType: string; size: number; status: string; createdAt: Date; deletedAt: Date | null; annotations?: Array<{ data: unknown }> }> }> }).milestones.find((m) => m.chapter === chapKey)
        const allSubs = (milestone?.submissions ?? []) as Array<{ id: number; fileName: string; blobUrl: string; mimeType: string; size: number; status: string; createdAt: Date; deletedAt: Date | null; annotations?: Array<{ data: unknown }> }>
        const submissions: ChapterSubmissionBrief[] = allSubs
          .slice()
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((s, idx, arr) => {
            const version = arr.length - idx
            let comments = 0
            let pages = 0
            if (s.annotations && s.annotations.length > 0) {
              const allItems = s.annotations.flatMap((a) => (Array.isArray(a.data) ? (a.data as unknown[]) : []))
              comments = allItems.filter((it) => {
                const obj = it as { annotation?: { contents?: string } }
                return obj.annotation?.contents && String(obj.annotation.contents).trim().length > 0
              }).length
              const pageSet = new Set(
                allItems
                  .map((it) => (it as { annotation?: { pageIndex?: number } })?.annotation?.pageIndex)
                  .filter((v): v is number => typeof v === 'number'),
              )
              pages = pageSet.size || (comments > 0 ? 1 : 0)
            }
            return {
              id: s.id,
              version,
              fileName: s.fileName,
              blobUrl: s.blobUrl,
              mimeType: s.mimeType,
              size: s.size,
              status: s.status,
              createdAt: s.createdAt.toISOString(),
              comments,
              pages,
            }
          })

        return {
          chapter: row.slug,
          label: row.label,
          status: row.state as SectionGroupChapter['status'],
          submissions,
        }
      })

    const defenses: SectionGroupDefense[] = ((group as unknown as { defenseSchedules?: { id: number; type: string; date: Date; venue: string; verdict: string }[] }).defenseSchedules ?? []).map((d) => ({
      id: d.id,
      type: d.type as 'PROPOSAL' | 'FINAL',
      date: d.date.toISOString(),
      venue: d.venue,
      verdict: d.verdict,
    }))

    const archiving: SectionGroupArchiving | null = (group as unknown as { archivingSubmission?: { status: string; title: string; fileName: string; blobUrl: string } | null }).archivingSubmission
      ? {
          status: (group as unknown as { archivingSubmission: { status: string } }).archivingSubmission.status,
          title: (group as unknown as { archivingSubmission: { title: string } }).archivingSubmission.title,
          fileName: (group as unknown as { archivingSubmission: { fileName: string } }).archivingSubmission.fileName,
          blobUrl: (group as unknown as { archivingSubmission: { blobUrl: string } }).archivingSubmission.blobUrl,
        }
      : null

    return {
      success: true,
      message: '',
      payload: {
        id: group.id,
        name: group.groupName,
        capstone2OpenedAt: group.section.capstone2OpenedAt?.toISOString() ?? null,
        members: group.students.map((s) => ({
          id: s.id,
          name: s.user.name,
          email: s.user.email,
          image: s.user.image,
          isLeader: group.leaderStudentId === s.id,
        })),
        adviser: group.adviser
          ? {
              name: group.adviser.faculty.user.name,
              email: group.adviser.faculty.user.email,
              image: group.adviser.faculty.user.image,
            }
          : null,
        topic: group.capstone
          ? {
              id: group.capstone.topic.id,
              title: group.capstone.topic.title,
              status: group.capstone.topic.status as 'PENDING' | 'APPROVED' | 'NEED_REVISION',
              note: null,
              submittedBy: group.capstone.topic.uploadedBy?.user.name ?? '',
              createdAt: group.capstone.topic.createdAt.toISOString(),
            }
          : null,
        journey,
        chapters,
        defenses,
        archiving,
      } satisfies SectionGroupDetail,
    }
  } catch (error) {
    console.error('[getCoordinatorGroupDetail | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch group.',
      payload: null,
    }
  }
}

