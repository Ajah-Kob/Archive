'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag, updateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { revalidateFeature } from '@/lib/actions/revalidate'
import type { SectionData } from '@/components/sections/main/SectionDataRow'
import type { StudentData } from '@/components/sections/students/StudentDataRow'
import { generateJoinCode, getInitials, timeAgo } from '@/lib/helper'
import { requireCoordinator } from '@/lib/actions/guard'
import { buildJourneyRows, resolveSectionAvailability } from '@/lib/journey'
import { CAPSTONE1_KEYS, CAPSTONE2_KEYS, keysForPhase } from '@/lib/milestones/phase'
import type {
  JourneyRow,
  TopicSubmissionStatus,
} from '@/types/milestones'
import type { MilestoneKey } from '@prisma/client'

const table = 'section'

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
                select: { id: true, name: true, email: true, avatarGradient: true },
              },
            },
          },
        },
      },
      students: {
        where: { deletedAt: null },
        select: { id: true, groupId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const payload: SectionData[] = sections.map((s) => ({
    id: s.id,
    coordinator: {
      initials: getInitials(s.coordinator.faculty.user.name),
      name: s.coordinator.faculty.user.name,
      email: s.coordinator.faculty.user.email,
      avatarGradient: s.coordinator.faculty.user.avatarGradient,
    },
    section: s.section,
    capstonePhase: s.capstone2OpenedAt ? 'CAPSTONE_2' : 'CAPSTONE_1',
    dateCreated: s.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    students: s.students.length,
    groups: new Set(
      s.students.filter((st) => st.groupId).map((st) => st.groupId),
    ).size,
  }))

  return payload
}

export interface SectionGroupProgress {
  id: number
  name: string
  memberCount: number
  adviser: { name: string; email: string; image: string | null } | null
  topicStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'NEEDS_REVISION'
  journey: JourneyRow[]
}

export interface PendingTopicMember {
  id: number
  name: string
  email: string
  isLeader: boolean
}

export interface PendingTopic {
  id: number
  groupId: number
  groupName: string
  members: PendingTopicMember[]
  title: string
  background: string
  submittedBy: string
  createdAt: string
  status: TopicSubmissionStatus
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
  pendingTopics: PendingTopic[]
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
    avatarGradient: (s.user as any).avatarGradient,
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
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
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

  const code = formData.get('code')?.toString().trim()
  if (!code) {
    return { success: false, message: 'Please enter an invitation code.' }
  }

  try {
    const joinCode = await prisma.joinCode.findFirst({
      where: {
        code,
        type: 'STUDENT',
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { section: true },
    })

    if (!joinCode) {
      return { success: false, message: 'Invalid or expired invitation code.' }
    }

    if (!joinCode.section) {
      return { success: false, message: 'No section is linked to this code.' }
    }

    const existingStudent = await prisma.student.findFirst({
      where: { userId: +session.user.id },
    })

    if (existingStudent && !existingStudent.deletedAt) {
      return {
        success: false,
        message: 'You are already enrolled in a section.',
      }
    }

    if (existingStudent) {
      // Resurrect a previously removed student (soft-deleted row) instead of
      // creating a new one — Student.userId is unique, so a fresh create
      // would throw a constraint violation.
      await prisma.student.update({
        where: { id: existingStudent.id },
        data: {
          sectionId: joinCode.section.id,
          groupId: null,
          deletedAt: null,
        },
      })
    } else {
      await prisma.student.create({
        data: {
          userId: +session.user.id,
          sectionId: joinCode.section.id,
        },
      })
    }

    await prisma.user.update({
      where: { id: +session.user.id },
      data: { role: 'STUDENT' },
    })

    updateTag('users')
    updateTag('sections')
    updateTag('my-sections')
    updateTag(`my-section-${joinCode.section.id}`)
    revalidateFeature('sections')

    return { success: true, message: 'Successfully joined the section.' }
  } catch (error) {
    console.error('joinSection error:', error)
    return {
      success: false,
      message: 'Something went wrong. Please try again.',
    }
  }
}

// SOFT DELETE (admin only)
export async function softDeleteSection(id: string) {
  const targetId = parseInt(id)
  if (Number.isNaN(targetId)) {
    return { success: false, payload: null, message: 'Invalid section id.' }
  }

  try {
    const target = await prisma[table].findFirst({
      where: { id: targetId, deletedAt: null },
    })
    if (!target) {
      return { success: false, payload: null, message: 'Section not found.' }
    }

    const record = await prisma[table].update({
      where: { id: targetId },
      data: { deletedAt: new Date() },
    })

    revalidateTag('sections', 'max')
    revalidateFeature('sections')

    return {
      success: true,
      payload: record,
      message: 'Section deleted successfully.',
    }
  } catch {
    return {
      success: false,
      payload: null,
      message: 'Failed to delete section',
    }
  }
}

// ───────────────────────────── Coordinator: My Sections ─────────────────────────────

export interface MySectionCardData {
  id: number
  name: string
  students: number
  groups: number
  hasJoinCode: boolean
  joinCode: string | null
  joinCodeExpiresAt: string | null
  dateCreated: string
  pendingTopics: number
  capstone2OpenedAt: string | null
  previewAvatars: { initials: string; gradient: string }[]
  headerColor: string | null
}

const JOIN_CODE_TTL_MS = 3 * 24 * 60 * 60 * 1000

function revalidateCoordinatorCache(sectionId?: number) {
  revalidateTag('my-sections', 'max')
  revalidateTag('sections', 'max')
  revalidateTag('join-code', 'max')
  revalidateFeature('sections')
  if (sectionId) revalidateTag(`my-section-${sectionId}`, 'max')
}

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
      groups: {
        where: { deletedAt: null },
        include: {
          topics: {
            where: { status: 'PENDING', deletedAt: null },
            select: { id: true },
          },
        },
      },
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
        pendingTopics: s.groups.reduce((n, g) => n + g.topics.length, 0),
        capstone2OpenedAt: s.capstone2OpenedAt?.toISOString() ?? null,
        previewAvatars: s.students.slice(0, 3).map((st) => ({
          initials: getInitials(st.user.name),
          gradient: (st.user as any).avatarGradient,
        })),
        headerColor: (s as any).headerColor ?? null,
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
          topics: {
            where: { deletedAt: null },
            include: {
              uploadedBy: { include: { user: { select: { name: true } } } },
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
    avatarGradient: (s.user as any).avatarGradient,
    activityStatus: activityStatusFor(s.user.loggedInAt),
    loggedInAt: s.user.loggedInAt,
    group: s.group
      ? { name: s.group.groupName, members: s.group.students.length }
      : null,
  }))

  const capstone1Open = !!(section as any).capstone1OpenedAt
  const capstone2Open = !!section.capstone2OpenedAt
  const availability = resolveSectionAvailability(
    capstone1Open,
    capstone2Open,
    section.milestoneAvailability,
  )

  const groups: SectionGroupProgress[] = section.groups.map((g) => {
    const activeTopics = g.topics.filter((t) => !t.deletedAt)
    let topicStatus: SectionGroupProgress['topicStatus'] = 'NONE'
    if (activeTopics.some((t) => t.status === 'PENDING')) {
      topicStatus = 'PENDING'
    } else if (activeTopics.some((t) => t.status === 'NEED_REVISION')) {
      topicStatus = 'NEEDS_REVISION'
    } else if (activeTopics.some((t) => t.status === 'APPROVED')) {
      topicStatus = 'APPROVED'
    }

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
      topicStatus,
      journey: buildJourneyRows(
        {
          topics: activeTopics.map((t) => ({
            status: t.status,
            deletedAt: t.deletedAt,
          })),
          capstone: g.capstone ? { topicId: g.capstone.topicId } : null,
          milestones: g.milestones.map((m) => ({
            chapter: m.chapter,
            submissions: m.submissions,
          })),
          capstoneArchive: g.capstoneArchive,
          archivingSubmission: (g as unknown as { archivingSubmission?: { status: string; deletedAt: Date | null } | null }).archivingSubmission ?? null,
        },
        availability,
      ),
    }
  })

  const pendingTopics: PendingTopic[] = section.groups
    .flatMap((g) =>
      g.topics
        .filter((t) => t.status === 'PENDING' && !t.deletedAt)
        .map((t) => ({ topic: t, group: g })),
    )
    .sort((a, b) => b.topic.createdAt.getTime() - a.topic.createdAt.getTime())
    .map(({ topic, group }) => ({
      id: topic.id,
      groupId: group.id,
      groupName: group.groupName,
      members: group.students.map((s) => ({
        id: s.id,
        name: s.user.name,
        email: s.user.email,
        isLeader: group.leaderStudentId === s.id,
      })),
      title: topic.title,
      background: topic.background,
      submittedBy: topic.uploadedBy?.user.name ?? '',
      createdAt: topic.createdAt.toISOString(),
      status: topic.status,
    }))

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
      capstone1OpenedAt: (section as any).capstone1OpenedAt?.toISOString() ?? null,
      capstone2OpenedAt: section.capstone2OpenedAt?.toISOString() ?? null,
      headerColor: (section as any).headerColor ?? null,
    },
    students,
    groups,
    pendingTopics,
    milestones: buildMilestoneAvailability(section as any),
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

// ───────────────────────────── Topic versions ─────────────────────────────

export interface TopicVersionInfo {
  id: number
  topicNumber: number
  version: number
  title: string
  background: string
  submittedBy: string
  createdAt: string
  status: TopicSubmissionStatus
  isCurrent: boolean
  reviewNote: string | null
}

// All versions of a topic's revision chain (topicGroupKey). Version numbers
// mirror the student-side derivation: position in the chain + 1, ordered by
// createdAt. Previous versions are the soft-deleted rows in the chain.
export async function getTopicVersions(topicId: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  try {
    const topic = await prisma.topic.findFirst({
      where: { id: topicId, deletedAt: null },
      include: {
        group: {
          include: { section: { select: { coordinatorId: true } } },
        },
      },
    })
    if (!topic || topic.group.section.coordinatorId !== coordinator.id) {
      return { success: false, message: 'Topic not found.', payload: null }
    }

    const groupTopics = await prisma.topic.findMany({
      where: { groupId: topic.groupId },
      orderBy: { createdAt: 'asc' },
      include: { uploadedBy: { include: { user: { select: { name: true } } } } },
    })

    // Group topics into revision chains (topicGroupKey), then order the chains
    // by their first submission. The chain's position in that order is the
    // topic number (1, 2, 3…) the student submitted — shared by every version
    // in the chain. Mirrors the student-side derivation in getTopicSubmissionData.
    const chains = new Map<string, typeof groupTopics>()
    for (const t of groupTopics) {
      const key = t.topicGroupKey ?? `legacy-${t.id}`
      const chain = chains.get(key) ?? []
      chain.push(t)
      chains.set(key, chain)
    }
    const orderedChains = [...chains.values()].sort(
      (a, b) => a[0].createdAt.getTime() - b[0].createdAt.getTime(),
    )
    const chainIndex = orderedChains.findIndex((chain) =>
      chain.some((t) => t.id === topic.id),
    )
    const chain = orderedChains[chainIndex] ?? []
    const topicNumber = chainIndex + 1

    const versions: TopicVersionInfo[] = chain.map((t, index) => ({
      id: t.id,
      topicNumber,
      version: index + 1,
      title: t.title,
      background: t.background,
      submittedBy: t.uploadedBy?.user.name ?? '',
      createdAt: t.createdAt.toISOString(),
      status: t.status,
      isCurrent: t.id === topic.id && !t.deletedAt,
      reviewNote: t.reviewNote,
    }))

    return { success: true, message: '', payload: { versions } }
  } catch (error) {
    console.error('[getTopicVersions | Error]:', error)
    return {
      success: false,
      message: 'Failed to load topic versions.',
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
  { key: 'TOPIC_SUBMISSION', label: 'Topic Submission', phase: 'CAPSTONE 1' },
  { key: 'TOPIC_SELECTION', label: 'Topic Selection', phase: 'CAPSTONE 1' },
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
// missing rows fall back to: Topic Submission open by default, Capstone 2
// milestones following the legacy capstone2OpenedAt phase gate, everything
// else locked. Shares the same resolution as the student journey
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
      if (open && !(section as any).capstone1OpenedAt) {
        await prisma.section.update({
          where: { id: section.id },
          data: { capstone1OpenedAt: now },
        })
      } else if (!open && (section as any).capstone1OpenedAt) {
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

function validateSectionName(raw: string): string | null {
  const name = raw.trim()
  if (name.length < 3 || name.length > 60) {
    return 'Section name must be between 3 and 60 characters.'
  }
  if (name !== raw) {
    return 'Section name cannot have leading or trailing spaces.'
  }
  return name
}

function parseHeaderColor(raw: unknown): string | null | { error: string } {
  const v = typeof raw === 'string' ? raw.trim() : ''
  if (!v || v === 'default') return null
  if (['0', '1', '2', '3', '4'].includes(v)) return v
  return { error: 'Invalid color selected.' }
}

export async function createSection(_prevState: any, formData: FormData) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  const name = validateSectionName(formData.get('name')?.toString() ?? '')
  if (typeof name !== 'string') {
    return { success: false, message: name }
  }

  const headerColorRaw = parseHeaderColor(formData.get('headerColor'))
  if (headerColorRaw && typeof headerColorRaw === 'object' && 'error' in headerColorRaw) {
    return { success: false, message: headerColorRaw.error }
  }
  const headerColor = headerColorRaw as string | null

  const existing = await prisma.section.findFirst({
    where: {
      coordinatorId: coordinator.id,
      section: { equals: name, mode: 'insensitive' },
    },
  })
  if (existing && !existing.deletedAt) {
    return { success: false, message: `Section ${name} already exists.` }
  }

  try {
    const code = generateJoinCode()
    const expiresAt = new Date(Date.now() + JOIN_CODE_TTL_MS)

    if (existing && existing.deletedAt) {
      // Resurrect a previously removed section and reassign it to this
      // coordinator with a fresh join code.
      if (existing.joinCodeId) {
        await prisma.joinCode.update({
          where: { id: existing.joinCodeId },
          data: { deletedAt: new Date() },
        })
      }
      const joinCode = await prisma.joinCode.create({
        data: { code, type: 'STUDENT', expiresAt },
      })
      await prisma.section.update({
        where: { id: existing.id },
        data: {
          coordinatorId: coordinator.id,
          joinCodeId: joinCode.id,
          headerColor,
          deletedAt: null,
        },
      })
    } else {
      const joinCode = await prisma.joinCode.create({
        data: { code, type: 'STUDENT', expiresAt },
      })
      await prisma.section.create({
        data: {
          coordinatorId: coordinator.id,
          section: name,
          headerColor,
          joinCodeId: joinCode.id,
        },
      })
    }

    revalidateCoordinatorCache()
    return { success: true, message: `Section ${name} created successfully.` }
  } catch (error) {
    console.error('[createSection | Error]:', error)
    return { success: false, message: 'Failed to create section.' }
  }
}

export async function updateSection(_prevState: any, formData: FormData) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  const sectionId = parseInt(formData.get('sectionId')?.toString() ?? '')
  if (Number.isNaN(sectionId)) {
    return { success: false, message: 'Invalid section.' }
  }

  const name = validateSectionName(formData.get('name')?.toString() ?? '')
  if (typeof name !== 'string') {
    return { success: false, message: name }
  }

  const headerColorRaw = parseHeaderColor(formData.get('headerColor'))
  if (headerColorRaw && typeof headerColorRaw === 'object' && 'error' in headerColorRaw) {
    return { success: false, message: headerColorRaw.error }
  }
  const headerColor = headerColorRaw as string | null

  try {
    const current = await prisma.section.findFirst({
      where: { id: sectionId, coordinatorId: coordinator.id, deletedAt: null },
    })
    if (!current) {
      return { success: false, message: 'Section not found.' }
    }

    const nameChanged = current.section !== name
    const currentColor = (current as any).headerColor ?? null
    const colorChanged = currentColor !== headerColor

    if (!nameChanged && !colorChanged) {
      return { success: true, message: 'No changes to save.' }
    }

    // Color-only change (name stays same)
    if (!nameChanged && colorChanged) {
      await prisma.section.update({
        where: { id: current.id },
        data: { headerColor },
      })
      revalidateCoordinatorCache(sectionId)
      return { success: true, message: 'Section updated.' }
    }

    const target = await prisma.section.findFirst({
      where: {
        coordinatorId: coordinator.id,
        section: { equals: name, mode: 'insensitive' },
      },
    })
    if (target && !target.deletedAt) {
      return { success: false, message: `Section ${name} already exists.` }
    }

    if (target && target.deletedAt) {
      // Resurrect-on-edit (swap): revive the target, transfer this section's
      // join code, students and groups onto it, then soft-delete the old row.
      if (target.joinCodeId && target.joinCodeId !== current.joinCodeId) {
        await prisma.joinCode.update({
          where: { id: target.joinCodeId },
          data: { deletedAt: new Date() },
        })
      }
      await prisma.$transaction([
        prisma.section.update({
          where: { id: current.id },
          data: { joinCodeId: null },
        }),
        prisma.section.update({
          where: { id: target.id },
          data: {
            coordinatorId: coordinator.id,
            joinCodeId: current.joinCodeId,
            headerColor,
            section: name,
            deletedAt: null,
          },
        }),
        prisma.student.updateMany({
          where: { sectionId: current.id },
          data: { sectionId: target.id },
        }),
        prisma.group.updateMany({
          where: { sectionId: current.id },
          data: { sectionId: target.id },
        }),
        prisma.section.update({
          where: { id: current.id },
          data: { deletedAt: new Date() },
        }),
      ])
    } else {
      await prisma.section.update({
        where: { id: current.id },
        data: { section: name, headerColor },
      })
    }

    revalidateCoordinatorCache(sectionId)
    return { success: true, message: `Section renamed to ${name}.` }
  } catch (error) {
    console.error('[updateSection | Error]:', error)
    return { success: false, message: 'Failed to update section.' }
  }
}

export async function removeSection(id: number) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  try {
    const section = await prisma.section.findFirst({
      where: { id, coordinatorId: coordinator.id, deletedAt: null },
    })
    if (!section) {
      return { success: false, message: 'Section not found.' }
    }

    const [studentCount, groupCount] = await prisma.$transaction([
      prisma.student.count({ where: { sectionId: section.id, deletedAt: null } }),
      prisma.group.count({ where: { sectionId: section.id } }),
    ])

    if (studentCount > 0 || groupCount > 0) {
      return {
        success: false,
        message: 'Only empty sections can be removed. Move or remove students first.',
      }
    }

    if (section.joinCodeId) {
      await prisma.joinCode.update({
        where: { id: section.joinCodeId },
        data: { deletedAt: new Date() },
      })
    }
    await prisma.section.update({
      where: { id: section.id },
      data: { deletedAt: new Date() },
    })

    revalidateCoordinatorCache(section.id)
    return { success: true, message: `Section ${section.section} removed.` }
  } catch (error) {
    console.error('[removeSection | Error]:', error)
    return { success: false, message: 'Failed to remove section.' }
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

// ───────────────────────────── Milestone phases & topic review ─────────────────────────────

// Coordinator reviews a pending topic proposal from a group in their section.
// Approving unlocks the group's Topic Selection step (see buildJourneyRows).
export async function reviewTopic(
  topicId: number,
  decision: 'APPROVED' | 'NEED_REVISION',
  note?: string,
) {
  const coordinator = await requireCoordinatorRow()
  if (!coordinator) {
    return { success: false, message: 'You are not authorized to perform this action.' }
  }

  try {
    const topic = await prisma.topic.findFirst({
      where: {
        id: topicId,
        status: 'PENDING',
        deletedAt: null,
        group: {
          deletedAt: null,
          section: { coordinatorId: coordinator.id, deletedAt: null },
        },
      },
      include: {
        group: {
          select: {
            id: true,
            sectionId: true,
            students: {
              where: { deletedAt: null },
              select: { userId: true },
            },
          },
        },
      },
    })
    if (!topic) {
      return { success: false, message: 'Topic not found in your sections.' }
    }

    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        status: decision,
        reviewNote: note?.trim() || null,
        reviewedById: coordinator.faculty.userId,
        reviewedAt: new Date(),
      },
    })

    revalidateTag('my-sections', { expire: 0 })
    revalidateTag(`my-section-${topic.group.sectionId}`, { expire: 0 })
    revalidateTag(`journey-${topic.group.id}`, { expire: 0 })
    for (const student of topic.group.students) {
      revalidateTag(`workspace-${student.userId}`, { expire: 0 })
    }

    return {
      success: true,
      message:
        decision === 'APPROVED'
          ? 'Topic approved.'
          : 'Revision requested for this topic.',
    }
  } catch (error) {
    console.error('[reviewTopic | Error]:', error)
    return { success: false, message: 'Failed to review the topic.' }
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

export interface SectionGroupChapter {
  chapter: string
  label: string
  status: 'LOCKED' | 'DEFAULT' | 'SUBMITTED' | 'NEEDS_REVISION' | 'APPROVED'
  fileName: string | null
  blobUrl: string | null
  submittedAt: string | null
  reviewedAt: string | null
  reviewNote: string | null
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
              where: { deletedAt: null },
              select: { status: true, deletedAt: true, fileName: true, blobUrl: true, createdAt: true, reviewedAt: true, reviewNote: true, mimeType: true, size: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        capstoneArchive: { select: { deletedAt: true } },
        archivingSubmission: { select: { status: true, deletedAt: true, title: true, fileName: true, blobUrl: true, mimeType: true, size: true } },
        defenseSchedules: {
          where: { deletedAt: null },
          select: { id: true, type: true, date: true, venue: true, verdict: true, startTime: true, endTime: true },
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
        topics: group.topics.map((t) => ({
          status: t.status,
          deletedAt: t.deletedAt,
        })),
        capstone: group.capstone ? { topicId: group.capstone.topicId } : null,
        milestones: group.milestones.map((m) => ({
          chapter: m.chapter,
          submissions: m.submissions,
        })),
        capstoneArchive: group.capstoneArchive,
        archivingSubmission: (group as unknown as { archivingSubmission?: { status: string; deletedAt: Date | null } | null }).archivingSubmission ?? null,
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
        const milestone = group.milestones.find((m) => `chapter-${m.chapter.slice(-1)}` === row.slug)
        const sub = milestone?.submissions[0]
        return {
          chapter: row.slug,
          label: row.label,
          status: row.state as SectionGroupChapter['status'],
          fileName: (sub as unknown as { fileName?: string })?.fileName ?? null,
          blobUrl: (sub as unknown as { blobUrl?: string })?.blobUrl ?? null,
          submittedAt: (sub as unknown as { createdAt?: Date })?.createdAt?.toISOString() ?? null,
          reviewedAt: (sub as unknown as { reviewedAt?: Date | null })?.reviewedAt?.toISOString() ?? null,
          reviewNote: (sub as unknown as { reviewNote?: string | null })?.reviewNote ?? null,
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
              note: group.capstone.topic.reviewNote,
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

