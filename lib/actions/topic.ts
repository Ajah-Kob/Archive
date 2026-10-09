'use server'

import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireStudent, unauthorized } from '@/lib/actions/guard'
import { audit } from '@/lib/actions/audit'

// Revalidates every cache that surfaces a group's topic: each member's
// workspace, the journey, and the coordinator's section views.
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
          leaderStudentId: true,
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

// ───────────────────────────── Final topic (single-topic flow) ─────────────

// Saves the group's single final topic directly on the group row. The leader
// can set or update it at any time. There is no coordinator review in this
// flow — the topic is final on save.
export async function saveFinalTopic(_prevState: any, formData: FormData) {
  const student = await getStudentGroup()
  if (!student?.group) return unauthorized

  const group = student.group
  if (group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can set the topic.' }
  }

  const title = formData.get('title')?.toString().trim() ?? ''
  if (!title) {
    return { success: false, message: 'Title is required.' }
  }
  const wordCount = title.split(/\s+/).length
  if (wordCount > 25) {
    return { success: false, message: 'Title must not exceed 25 words.' }
  }

  const now = new Date()
  await prisma.group.update({
    where: { id: group.id },
    data: {
      topicTitle: title,
      topicSubmittedById: student.id,
      topicSubmittedAt: now,
    },
  })

  try {
    await audit({
      action: 'TOPIC_SAVE',
      entity: 'GROUP',
      entityId: String(group.id),
      entityName: group.groupName,
      before: null,
      after: { title },
      sectionId: group.sectionId,
    })
  } catch {}

  revalidateGroupTopics(group, { expireNow: true })
  return { success: true, message: 'Final topic saved.' }
}
