'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { requireStudent, unauthorized } from '@/lib/actions/guard'
import { buildJourneyRows, resolveSectionAvailability } from '@/lib/journey'
import { TOPIC_CAP } from '@/types/milestones'
import type {
  TopicSubmissionItem,
  TopicSubmissionPayload,
  TopicSubmissionStatus,
} from '@/types/milestones'

// Revalidates every cache that surfaces a group's topics: each member's
// workspace, the journey, and the coordinator's section views (topic queue).
function revalidateGroupTopics(group: {
  id: number
  sectionId: number
  students: { userId: number }[]
}) {
  for (const student of group.students) {
    revalidateTag(`workspace-${student.userId}`, 'max')
  }
  revalidateTag(`journey-${group.id}`, 'max')
  revalidateTag(`my-section-${group.sectionId}`, 'max')
  revalidateTag('my-sections', 'max')
  revalidateTag('sections', 'max')
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
        include: {
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
  }
}

// ───────────────────────────── Read ─────────────────────────────

// All data for the Topic Submission workspace, keyed per user so 'use cache'
// stays isolated. Derives version numbers from topicGroupKey chains.
export async function getTopicSubmissionData(
  userId: number,
): Promise<{ success: boolean; message: string; payload: TopicSubmissionPayload | null }> {
  'use cache'
  cacheTag(`workspace-${userId}`)
  cacheLife('max')

  const student = await prisma.student.findFirst({
    where: { userId, deletedAt: null },
    include: {
      section: {
        select: {
          id: true,
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
                select: { status: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          capstoneArchive: { select: { deletedAt: true } },
        },
      },
    },
  })

  if (!student) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  const availability = resolveSectionAvailability(
    !!student.section.capstone2OpenedAt,
    student.section.milestoneAvailability,
  )

  const group = student.group
  if (!group) {
    return {
      success: true,
      message: '',
      payload: {
        group: null,
        journey: buildJourneyRows(null, availability),
        topics: [],
        history: [],
        count: 0,
        cap: TOPIC_CAP,
        hasApproved: false,
        canSubmit: false,
      },
    }
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

  const count = topics.length
  const hasApproved = topics.some((t) => t.status === 'APPROVED')

  const journey = buildJourneyRows(
    {
      topics: group.topics.map((t) => ({ status: t.status, deletedAt: t.deletedAt })),
      capstone: group.capstone,
      milestones: group.milestones.map((m) => ({
        chapter: m.chapter,
        submissions: m.submissions,
      })),
      capstoneArchive: group.capstoneArchive,
    },
    availability,
  )

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
      topics,
      history,
      count,
      cap: TOPIC_CAP,
      hasApproved,
      canSubmit: !hasApproved && count < TOPIC_CAP,
    },
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

  revalidateGroupTopics(group)
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

  revalidateGroupTopics(group)
  return { success: true, message: 'Topic resubmitted for review.' }
}
