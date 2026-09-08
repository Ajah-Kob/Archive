'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireStudent, unauthorized } from '@/lib/actions/guard'
import { buildJourneyRows, resolveSectionAvailability } from '@/lib/journey'
import { TOPIC_CAP } from '@/types/milestones'
import type {
  TopicSelectionPayload,
  TopicSubmissionItem,
  TopicSubmissionPayload,
  TopicSubmissionStatus,
} from '@/types/milestones'

// Revalidates every cache that surfaces a group's topics: each member's
// workspace, the journey, and the coordinator's section views (topic queue).
// Pass `{ expireNow: true }` to force-expire the tags (revalidateTag with
// { expire: 0 }) instead of stale-while-revalidate, so the acting user's next
// load reflects the change immediately.
function revalidateGroupTopics(
  group: {
    id: number
    sectionId: number
    students: { userId: number }[]
  },
  opts?: { expireNow?: boolean },
) {
  const config = opts?.expireNow ? ({ expire: 0 } as const) : 'max'
  for (const student of group.students) {
    revalidateTag(`workspace-${student.userId}`, config)
  }
  revalidateTag(`journey-${group.id}`, config)
  revalidateTag(`my-section-${group.sectionId}`, config)
  revalidateTag('my-sections', config)
  revalidateTag('sections', config)
}

// The authenticated student plus their live group (with active members), or
// null when they are not a student / have no group.
async function getStudentGroup() {
  const session = await requireStudent()
  if (!session) return null
  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: {
      group: {
        select: {
          id: true,
          groupName: true,
          sectionId: true,
          adviserId: true,
          students: {
            where: { deletedAt: null },
            select: { userId: true },
          },
        },
      },
    },
  })
  return student?.group ? student : null
}

function toItem(
  topic: {
    id: number
    title: string
    background: string
    status: TopicSubmissionStatus
    createdAt: Date
    updatedAt: Date
    reviewNote: string | null
    reviewedAt: Date | null
    selectedAt: Date | null
    uploadedBy: { user: { name: string } } | null
  },
  index: number,
  version: number,
): TopicSubmissionItem {
  return {
    id: topic.id,
    title: topic.title,
    background: topic.background,
    status: topic.status,
    index,
    version,
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString(),
    reviewNote: topic.reviewNote,
    reviewedAt: topic.reviewedAt ? topic.reviewedAt.toISOString() : null,
    submittedBy: topic.uploadedBy?.user.name ?? null,
    selectedAt: topic.selectedAt ? topic.selectedAt.toISOString() : null,
  }
}

// ───────────────────────────── Read ─────────────────────────────

// Shared loader for both the Topic Submission and Topic Selection workspaces.
// Returns the authenticated student's section availability, group, and the
// revision-chain items (topics + history) derived from topicGroupKey, plus the
// confirmed capstone topic id. Null when the user has no student record.
async function loadTopicWorkspace(userId: number) {
  const student = await prisma.student.findFirst({
    where: { userId, deletedAt: null },
    include: {
      section: {
        select: {
          id: true,
          capstone1OpenedAt: true,
          capstone2OpenedAt: true,
          milestoneAvailability: { select: { key: true, openedAt: true } },
        },
      },
      group: {
        include: {
          students: {
            where: { deletedAt: null },
            select: { userId: true },
          },
          topics: {
            orderBy: { createdAt: 'asc' },
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

  if (!student) return null

  const availability = resolveSectionAvailability(
    !!(student.section as any).capstone1OpenedAt,
    !!student.section.capstone2OpenedAt,
    student.section.milestoneAvailability,
  )

  const phaseLocks = {
    'CAPSTONE 1': !(student.section as any).capstone1OpenedAt,
    'CAPSTONE 2': !student.section.capstone2OpenedAt,
  } as const

  const group = student.group
  if (!group) {
    return { availability, phaseLocks, group: null, topics: [], history: [], capstoneTopicId: null }
  }

  // Group every topic into its revision chain (topicGroupKey). Legacy rows
  // without a key become singleton chains.
  const chains = new Map<string, typeof group.topics>()
  for (const topic of group.topics) {
    const key = topic.topicGroupKey ?? `legacy-${topic.id}`
    const chain = chains.get(key) ?? []
    chain.push(topic)
    chains.set(key, chain)
  }

  const orderedChains = [...chains.values()].sort(
    (a, b) => a[0].createdAt.getTime() - b[0].createdAt.getTime(),
  )

  const topics: TopicSubmissionItem[] = []
  const history: TopicSubmissionItem[] = []

  orderedChains.forEach((chain, chainIndex) => {
    const index = chainIndex + 1
    chain.forEach((topic, position) => {
      const version = position + 1
      const item = toItem(topic, index, version)
      if (topic.deletedAt) {
        history.push(item)
      } else {
        topics.push(item)
      }
    })
  })

  topics.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  history.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return {
    availability,
    phaseLocks,
    group,
    topics,
    history,
    capstoneTopicId: group.capstone?.topicId ?? null,
  }
}

function buildJourneySource(
  group: NonNullable<Awaited<ReturnType<typeof loadTopicWorkspace>>['group']>,
) {
  return {
    topics: group.topics.map((t) => ({ status: t.status, deletedAt: t.deletedAt })),
    capstone: group.capstone,
    milestones: group.milestones.map((m) => ({
      chapter: m.chapter,
      submissions: m.submissions,
    })),
    capstoneArchive: group.capstoneArchive,
    archivingSubmission: (group as unknown as { archivingSubmission?: { status: string; deletedAt: Date | null } | null }).archivingSubmission ?? null,
  }
}

// All data for the Topic Submission workspace. Read uncached so topic
// status, versions, and the journey reflect the persisted state immediately.
export async function getTopicSubmissionData(
  userId: number,
): Promise<{ success: boolean; message: string; payload: TopicSubmissionPayload | null }> {
  const loaded = await loadTopicWorkspace(userId)
  if (!loaded) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  const { availability, phaseLocks, group, topics, history, capstoneTopicId } = loaded

  if (!group) {
    return {
      success: true,
      message: '',
      payload: {
        group: null,
        journey: buildJourneyRows(null, availability),
        phaseLocks,
        topics: [],
        history: [],
        count: 0,
        cap: TOPIC_CAP,
        hasApproved: false,
        canSubmit: false,
      } as any,
    }
  }

  const count = topics.length
  const hasApproved = topics.some((t) => t.status === 'APPROVED')

  const journey = buildJourneyRows(buildJourneySource(group), availability)

  return {
    success: true,
    message: '',
    payload: {
      group: {
        id: group.id,
        groupName: group.groupName,
        sectionId: group.sectionId,
      },
      journey,
      phaseLocks,
      topics,
      history,
      count,
      cap: TOPIC_CAP,
      hasApproved,
      canSubmit: !hasApproved && count < TOPIC_CAP,
    } as any,
  }
}

// All data for the Topic Selection workspace. Returns the active submitted
// topics (with their pending selection state via selectedAt) plus the
// confirmed final topic id (Capstone.topicId) once it has been confirmed.
export async function getTopicSelectionData(
  userId: number,
): Promise<{ success: boolean; message: string; payload: TopicSelectionPayload | null }> {
  const loaded = await loadTopicWorkspace(userId)
  if (!loaded) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  const { availability, phaseLocks, group, topics, capstoneTopicId } = loaded

  if (!group) {
    return {
      success: true,
      message: '',
      payload: {
        group: null,
        journey: buildJourneyRows(null, availability),
        phaseLocks,
        topics: [],
        confirmedTopicId: null,
      } as any,
    }
  }

  const journey = buildJourneyRows(buildJourneySource(group), availability)

  return {
    success: true,
    message: '',
    payload: {
      group: {
        id: group.id,
        groupName: group.groupName,
        sectionId: group.sectionId,
      },
      journey,
      phaseLocks,
      topics,
      confirmedTopicId: capstoneTopicId,
    } as any,
  }
}

// ───────────────────────────── Mutations ─────────────────────────────

// First submission of a topic. Creates a new revision chain. Any member of the
// group can submit; up to TOPIC_CAP active topics; locked once one is approved.
export async function submitTopic(_prevState: any, formData: FormData) {
  const student = await getStudentGroup()
  if (!student?.group) return unauthorized

  const group = student.group
  const title = formData.get('title')?.toString().trim() ?? ''
  const background = formData.get('background')?.toString().trim() ?? ''
  if (!title || !background) {
    return { success: false, message: 'Title and background are required.' }
  }

  const wordCount = title === '' ? 0 : title.split(/\s+/).length
  if (wordCount > 25) {
    return { success: false, message: 'Title must not exceed 25 words.' }
  }

  const activeCount = await prisma.topic.count({
    where: { groupId: group.id, deletedAt: null },
  })
  if (activeCount >= TOPIC_CAP) {
    return {
      success: false,
      message: `Your group has reached the ${TOPIC_CAP}-topic limit.`,
    }
  }

  const approved = await prisma.topic.findFirst({
    where: { groupId: group.id, deletedAt: null, status: 'APPROVED' },
    select: { id: true },
  })
  if (approved) {
    return {
      success: false,
      message: 'Submissions are locked once a topic is approved.',
    }
  }

  await prisma.topic.create({
    data: {
      groupId: group.id,
      uploadedById: student.id,
      title,
      background,
      status: 'PENDING',
      topicGroupKey: crypto.randomUUID(),
    },
  })

  revalidateGroupTopics(group, { expireNow: true })
  return { success: true, message: 'Topic submitted for review.' }
}

// Resubmission of a topic that was marked NEED_REVISION. Supersedes the
// previous active row (soft-delete) and starts a new version in the same chain.
export async function resubmitTopic(
  topicId: number,
  _prevState: any,
  formData: FormData,
) {
  const student = await getStudentGroup()
  if (!student?.group) return unauthorized

  const group = student.group
  const title = formData.get('title')?.toString().trim() ?? ''
  const background = formData.get('background')?.toString().trim() ?? ''
  if (!title || !background) {
    return { success: false, message: 'Title and background are required.' }
  }

  const wordCount = title === '' ? 0 : title.split(/\s+/).length
  if (wordCount > 25) {
    return { success: false, message: 'Title must not exceed 25 words.' }
  }

  const existing = await prisma.topic.findFirst({
    where: {
      id: topicId,
      groupId: group.id,
      deletedAt: null,
      status: 'NEED_REVISION',
    },
  })
  if (!existing) {
    return {
      success: false,
      message: 'This topic cannot be resubmitted.',
    }
  }

  const approved = await prisma.topic.findFirst({
    where: { groupId: group.id, deletedAt: null, status: 'APPROVED' },
    select: { id: true },
  })
  if (approved) {
    return {
      success: false,
      message: 'Submissions are locked once a topic is approved.',
    }
  }

  await prisma.$transaction([
    prisma.topic.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    }),
    prisma.topic.create({
      data: {
        groupId: group.id,
        uploadedById: student.id,
        title,
        background,
        status: 'PENDING',
        topicGroupKey: existing.topicGroupKey ?? crypto.randomUUID(),
      },
    }),
  ])

  revalidateGroupTopics(group, { expireNow: true })
  return { success: true, message: 'Topic resubmitted for review.' }
}

// Marks an approved topic as the group's pending final topic selection.
// Only approved topics can be selected, only one at a time, and only before
// the selection has been confirmed (a Capstone row exists).
export async function setSelectedTopic(topicId: number) {
  const student = await getStudentGroup()
  if (!student?.group) return unauthorized

  const group = student.group

  const topic = await prisma.topic.findFirst({
    where: {
      id: topicId,
      groupId: group.id,
      deletedAt: null,
      status: 'APPROVED',
    },
    select: { id: true, selectedAt: true },
  })
  if (!topic) {
    return { success: false, message: 'Only approved topics can be selected.' }
  }

  const capstone = await prisma.capstone.findUnique({
    where: { groupId: group.id },
    select: { id: true },
  })
  if (capstone) {
    return {
      success: false,
      message: 'The capstone topic has already been confirmed and cannot be changed.',
    }
  }

  if (topic.selectedAt) {
    await prisma.topic.update({
      where: { id: topicId },
      data: { selectedAt: null },
    })
    revalidateGroupTopics(group, { expireNow: true })
    return { success: true, message: 'Topic unselected.' }
  }

  await prisma.$transaction([
    prisma.topic.updateMany({
      where: { groupId: group.id, deletedAt: null, NOT: { id: topicId } },
      data: { selectedAt: null },
    }),
    prisma.topic.update({
      where: { id: topicId },
      data: { selectedAt: new Date() },
    }),
  ])

  revalidateGroupTopics(group, { expireNow: true })
  return { success: true, message: 'Topic selected.' }
}

// Confirms the pending selection as the group's final capstone topic by
// creating the Capstone row. Once confirmed, the selection is final.
export async function confirmTopicSelection(topicId: number) {
  const student = await getStudentGroup()
  if (!student?.group) return unauthorized

  const group = student.group

  const topic = await prisma.topic.findFirst({
    where: {
      id: topicId,
      groupId: group.id,
      deletedAt: null,
      status: 'APPROVED',
      selectedAt: { not: null },
    },
    select: { id: true },
  })
  if (!topic) {
    return { success: false, message: 'Select an approved topic before confirming.' }
  }

  const capstone = await prisma.capstone.findUnique({
    where: { groupId: group.id },
    select: { id: true },
  })
  if (capstone) {
    return {
      success: false,
      message: 'The capstone topic has already been confirmed and cannot be changed.',
    }
  }

  await prisma.capstone.create({
    data: {
      groupId: group.id,
      topicId,
      adviserId: group.adviserId ?? null,
    },
  })

  revalidateGroupTopics(group, { expireNow: true })
  return { success: true, message: 'Topic confirmed as your final capstone topic.' }
}
