'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { requireStudent, unauthorized } from '@/lib/actions/guard'
import { ADVISER_CAP } from '@/config/constants'
import {
  GROUP_CAP,
  type AdviserOption,
  type AdviserState,
  type Classmate,
  type JourneyRow,
  type WorkspaceData,
} from '@/types/milestones'

const CHAPTER_SLUG: Record<string, string> = {
  CHAPTER_1: 'chapter-1',
  CHAPTER_2: 'chapter-2',
  CHAPTER_3: 'chapter-3',
  CHAPTER_4: 'chapter-4',
  CHAPTER_5: 'chapter-5',
}

type JourneySource = {
  topics: { status: string; deletedAt: Date | null }[]
  capstone: { topicId: number } | null
  milestones: {
    chapter: string
    submissions: { status: string }[]
  }[]
  capstoneArchive: { deletedAt: Date | null } | null
}

// Derives the 8 journey rows from a group's data. Passing `null` (groupless)
// renders every row locked — there is no data to derive from.
function buildJourneyRows(group: JourneySource | null): JourneyRow[] {
  if (!group) {
    return JOURNEY_ROWS_EMPTY
  }

  const topics = group.topics.filter((t) => !t.deletedAt)
  const approved = topics.filter((t) => t.status === 'APPROVED')
  const needsRevision = topics.filter((t) => t.status === 'NEED_REVISION')
  const pending = topics.filter((t) => t.status === 'PENDING')

  const rows: JourneyRow[] = []

  // Topic Submission — derived from Topic rows.
  const topicSubmission: JourneyRow = {
    slug: 'topic-submission',
    label: 'Topic Submission',
    header: 'INITIAL',
    state: 'DEFAULT',
  }
  if (needsRevision.length > 0) {
    topicSubmission.state = 'NEEDS_REVISION'
    topicSubmission.sublabel = `${needsRevision.length} ${
      needsRevision.length === 1 ? 'needs' : 'need'
    } revision`
  } else if (approved.length > 0 && pending.length === 0) {
    topicSubmission.state = 'APPROVED'
    topicSubmission.sublabel = `${approved.length} Approved`
  } else if (pending.length > 0) {
    topicSubmission.state = 'SUBMITTED'
    topicSubmission.sublabel = `${pending.length} Submitted`
  }
  rows.push(topicSubmission)

  // Topic Selection — unlocked by an approved topic; green once selected.
  const topicSelection: JourneyRow = {
    slug: 'topic-selection',
    label: 'Topic Selection',
    header: 'INITIAL',
    state: 'DEFAULT',
  }
  if (approved.length === 0) {
    topicSelection.state = 'LOCKED'
  } else if (group.capstone?.topicId) {
    topicSelection.state = 'APPROVED'
    topicSelection.sublabel = 'Topic Selected'
  }
  rows.push(topicSelection)

  // Chapters — render from Milestone rows when they exist (created by the
  // future capstone workspace); otherwise the coordinator gate keeps them locked.
  const milestoneByChapter = new Map(
    group.milestones.map((m) => [m.chapter, m]),
  )
  for (const chapter of ['CHAPTER_1', 'CHAPTER_2', 'CHAPTER_3', 'CHAPTER_4', 'CHAPTER_5']) {
    const slug = CHAPTER_SLUG[chapter]
    const milestone = milestoneByChapter.get(chapter)
    const row: JourneyRow = {
      slug,
      label: `Chapter ${chapter.slice(-1)}`,
      header: slug.startsWith('chapter-4') || slug.startsWith('chapter-5')
        ? 'CAPSTONE 2'
        : 'CAPSTONE 1',
      state: 'LOCKED',
    }
    if (milestone) {
      const latest = milestone.submissions[0]
      if (!latest) {
        row.state = 'DEFAULT'
      } else if (latest.status === 'APPROVED') {
        row.state = 'APPROVED'
        row.sublabel = 'Approved'
      } else if (latest.status === 'NEED_REVISION') {
        row.state = 'NEEDS_REVISION'
        row.sublabel = 'Needs Revision'
      } else {
        row.state = 'SUBMITTED'
        row.sublabel = 'Submitted'
      }
    }
    rows.push(row)
  }

  // Archiving — derived from CapstoneArchive.
  const archiving: JourneyRow = {
    slug: 'archiving',
    label: 'Archiving',
    header: 'FINAL',
    state: 'LOCKED',
  }
  if (group.capstoneArchive && !group.capstoneArchive.deletedAt) {
    archiving.state = 'APPROVED'
    archiving.sublabel = 'Archived'
  }
  rows.push(archiving)

  return rows
}

// Statically built groupless journey (all locked) so we never allocate it per request.
const JOURNEY_ROWS_EMPTY: JourneyRow[] = [
  { slug: 'topic-submission', label: 'Topic Submission', header: 'INITIAL', state: 'LOCKED' },
  { slug: 'topic-selection', label: 'Topic Selection', header: 'INITIAL', state: 'LOCKED' },
  { slug: 'chapter-1', label: 'Chapter 1', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'chapter-2', label: 'Chapter 2', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'chapter-3', label: 'Chapter 3', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'chapter-4', label: 'Chapter 4', header: 'CAPSTONE 2', state: 'LOCKED' },
  { slug: 'chapter-5', label: 'Chapter 5', header: 'CAPSTONE 2', state: 'LOCKED' },
  { slug: 'archiving', label: 'Archiving', header: 'FINAL', state: 'LOCKED' },
]

function revalidateWorkspace(userId?: number, groupId?: number) {
  if (userId) revalidateTag(`workspace-${userId}`, 'max')
  if (groupId) revalidateTag(`journey-${groupId}`, 'max')
  revalidateTag('sections', 'max')
  revalidateTag('my-sections', 'max')
}

function revalidateAdviserCaches() {
  revalidateTag('advisers', 'max')
  revalidateTag('faculty', 'max')
}

// ───────────────────────────── Reads ─────────────────────────────

// The full student workspace: section, group (members / adviser / invites)
// and the derived journey rows. Keyed by userId so 'use cache' stays per-user.
export async function getMyWorkspace(userId: number): Promise<{
  success: boolean
  message: string
  payload: WorkspaceData | null
}> {
  'use cache'
  cacheTag(`workspace-${userId}`)
  cacheLife('max')

  const student = await prisma.student.findFirst({
    where: { userId, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      section: { select: { id: true, section: true } },
      group: {
        include: {
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
                  user: { select: { id: true, name: true, email: true, image: true } },
                },
              },
            },
          },
          invitations: {
            where: { deletedAt: null },
            include: {
              student: {
                include: {
                  user: { select: { id: true, name: true, email: true, image: true } },
                },
              },
              faculty: {
                include: {
                  user: { select: { id: true, name: true, email: true, image: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          topics: {
            where: { deletedAt: null },
            select: { status: true, deletedAt: true },
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

  const base = {
    student: {
      id: student.id,
      userId: student.user.id,
      name: student.user.name,
      email: student.user.email,
      image: student.user.image,
    },
    section: { id: student.section.id, name: student.section.section },
  }

  if (!student.group) {
    return {
      success: true,
      message: '',
      payload: { ...base, group: null, journey: buildJourneyRows(null) },
    }
  }

  const group = student.group
  cacheTag(`journey-${group.id}`)

  const isLeader = group.leaderStudentId === student.id
  const members = group.students.map((s) => ({
    id: s.id,
    userId: s.user.id,
    name: s.user.name,
    email: s.user.email,
    image: s.user.image,
    isLeader: s.id === group.leaderStudentId,
  }))

  // Adviser state: assigned (accepted) > pending (invite out) > none.
  let adviser: AdviserState = { state: 'none', canManage: isLeader }

  if (group.adviser) {
    const adviserRecord = group.adviser
    const [groupCount, capstoneCount] = await prisma.$transaction([
      prisma.group.count({
        where: { adviserId: adviserRecord.id, deletedAt: null },
      }),
      prisma.capstone.count({
        where: { adviserId: adviserRecord.id, deletedAt: null },
      }),
    ])
    const workload = groupCount + capstoneCount
    adviser = {
      state: 'assigned',
      canManage: isLeader,
      facultyId: adviserRecord.facultyId,
      name: adviserRecord.faculty.user.name,
      email: adviserRecord.faculty.user.email,
      image: adviserRecord.faculty.user.image,
      workload,
      atCap: workload >= ADVISER_CAP,
    }
  } else {
    const pendingAdviser = group.invitations.find(
      (i) => i.role === 'ADVISER_ASSIGNMENT' && i.status === 'PENDING',
    )
    if (pendingAdviser) {
      const facultyUser = pendingAdviser.faculty?.user
      adviser = {
        state: 'pending',
        canManage: isLeader,
        invitationId: pendingAdviser.id,
        name: facultyUser?.name,
        email: facultyUser?.email,
        image: facultyUser?.image ?? null,
      }
    }
  }

  const invitations = group.invitations
    .filter((i) => i.role === 'GROUP' && i.student)
    .map((i) => ({
      id: i.id,
      studentId: i.studentId,
      name: i.student.user.name,
      email: i.student.user.email,
      image: i.student.user.image,
      status: i.status,
    }))
  const pendingCount = invitations.filter((i) => i.status === 'PENDING').length

  const payload: WorkspaceData = {
    ...base,
    group: {
      id: group.id,
      name: group.groupName,
      isLeader,
      memberCount: members.length,
      pendingCount,
      members,
      adviser,
      invitations,
    },
    journey: buildJourneyRows(group),
  }

  return { success: true, message: '', payload }
}

// Same-section classmates who are not yet in a group and can be invited.
export async function getAvailableClassmates(userId: number): Promise<{
  success: boolean
  message: string
  payload: Classmate[] | null
}> {
  'use cache'
  cacheTag(`classmates-${userId}`)
  cacheLife('max')

  const leader = await prisma.student.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, sectionId: true, groupId: true },
  })
  if (!leader) {
    return { success: false, message: 'Not authorized', payload: null }
  }

  const classmates = await prisma.student.findMany({
    where: {
      sectionId: leader.sectionId,
      groupId: null,
      deletedAt: null,
      id: { not: leader.id },
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  let invitedIds: number[] = []
  if (leader.groupId) {
    const pendingInvites = await prisma.invitation.findMany({
      where: {
        groupId: leader.groupId,
        role: 'GROUP',
        status: 'PENDING',
        deletedAt: null,
      },
      select: { studentId: true },
    })
    invitedIds = pendingInvites.map((i) => i.studentId)
  }

  const invitedSet = new Set(invitedIds)

  const payload: Classmate[] = classmates.map((s) => ({
    id: s.id,
    userId: s.user.id,
    name: s.user.name,
    email: s.user.email,
    image: s.user.image,
    invited: invitedSet.has(s.id),
  }))

  return { success: true, message: '', payload }
}

// All active faculty (coordinators and program chair included) with workload.
export async function getAvailableAdvisers(): Promise<{
  success: boolean
  message: string
  payload: AdviserOption[] | null
}> {
  'use cache'
  cacheTag('advisers')
  cacheTag('faculty')
  cacheLife('max')

  const faculty = await prisma.faculty.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      adviser: {
        include: {
          groups: { where: { deletedAt: null }, select: { id: true } },
          capstones: { where: { deletedAt: null }, select: { id: true } },
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  })

  const payload: AdviserOption[] = faculty.map((f) => {
    const workload =
      (f.adviser?.groups.length ?? 0) + (f.adviser?.capstones.length ?? 0)
    return {
      id: f.id,
      userId: f.userId,
      name: f.user.name,
      email: f.user.email,
      image: f.user.image,
      workload,
      atCap: workload >= ADVISER_CAP,
    }
  })

  return { success: true, message: '', payload }
}

// ───────────────────────────── Mutations ─────────────────────────────

// Creates a group with the caller as leader and sends GROUP invites to the
// selected classmates (they join by accepting from the bell panel).
export async function createGroup(name: string, memberIds: number[]) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const cleanName = name.trim()
  if (!cleanName) {
    return { success: false, message: 'Group name is required.' }
  }
  if (cleanName.length > 50) {
    return { success: false, message: 'Group name must be 50 characters or fewer.' }
  }

  const leader = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    select: { id: true, sectionId: true, groupId: true },
  })
  if (!leader) return { success: false, message: 'Student record not found.' }
  if (leader.groupId) {
    return { success: false, message: 'You are already in a group.' }
  }

  const memberIdsUnique = [...new Set(memberIds)]
  if (memberIdsUnique.length > GROUP_CAP - 1) {
    return {
      success: false,
      message: `You can invite up to ${GROUP_CAP - 1} classmates.`,
    }
  }

  const duplicate = await prisma.group.findFirst({
    where: {
      sectionId: leader.sectionId,
      groupName: { equals: cleanName, mode: 'insensitive' },
      deletedAt: null,
    },
    select: { id: true },
  })
  if (duplicate) {
    return {
      success: false,
      message: 'A group with this name already exists in your section.',
    }
  }

  const classmates =
    memberIdsUnique.length > 0
      ? await prisma.student.findMany({
          where: {
            id: { in: memberIdsUnique },
            sectionId: leader.sectionId,
            groupId: null,
            deletedAt: null,
          },
          include: { user: { select: { id: true } } },
        })
      : []
  if (classmates.length !== memberIdsUnique.length) {
    return {
      success: false,
      message: 'Some selected students are no longer available.',
    }
  }

  try {
    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          groupName: cleanName,
          sectionId: leader.sectionId,
          leaderStudentId: leader.id,
        },
      })
      await tx.student.update({
        where: { id: leader.id },
        data: { groupId: created.id },
      })
      if (classmates.length > 0) {
        await tx.invitation.createMany({
          data: classmates.map((s) => ({
            studentId: s.id,
            groupId: created.id,
            role: 'GROUP',
            invitedById: +session.user.id!,
            status: 'PENDING',
          })),
        })
      }
      return created
    })

    for (const c of classmates) {
      revalidateTag(`my-invitations-${c.user.id}`, 'max')
      revalidateTag(`classmates-${c.user.id}`, 'max')
    }
    revalidateTag(`workspace-${session.user.id}`, 'max')
    revalidateTag(`classmates-${session.user.id}`, 'max')
    revalidateTag('sections', 'max')
    revalidateTag('my-sections', 'max')

    return {
      success: true,
      message: 'Group created successfully.',
      payload: { groupId: group.id },
    }
  } catch {
    return { success: false, message: 'Failed to create group.' }
  }
}

// Leader-only: invite more section-mates into an existing group (up to the cap).
export async function inviteGroupMembers(memberIds: number[]) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true, sectionId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can invite members.' }
  }

  const memberCount = await prisma.student.count({
    where: { groupId: student.group.id, deletedAt: null },
  })
  const remaining = GROUP_CAP - memberCount
  if (remaining <= 0) {
    return { success: false, message: `Your group is already full (${GROUP_CAP} members).` }
  }

  const memberIdsUnique = [...new Set(memberIds)]
  if (memberIdsUnique.length === 0) {
    return { success: false, message: 'Select at least one classmate to invite.' }
  }
  if (memberIdsUnique.length > remaining) {
    return { success: false, message: `You can invite up to ${remaining} more classmates.` }
  }

  const groupId = student.group.id
  const classmates = await prisma.student.findMany({
    where: {
      id: { in: memberIdsUnique },
      sectionId: student.group.sectionId,
      groupId: null,
      deletedAt: null,
    },
    include: { user: { select: { id: true } } },
  })
  if (classmates.length !== memberIdsUnique.length) {
    return {
      success: false,
      message: 'Some selected students are no longer available.',
    }
  }

  try {
    await prisma.invitation.createMany({
      data: classmates.map((s) => ({
        studentId: s.id,
        groupId,
        role: 'GROUP',
        invitedById: +session.user.id!,
        status: 'PENDING',
      })),
    })

    for (const c of classmates) {
      revalidateTag(`my-invitations-${c.user.id}`, 'max')
      revalidateTag(`classmates-${c.user.id}`, 'max')
    }
    revalidateTag(`classmates-${session.user.id}`, 'max')
    revalidateWorkspace(+session.user.id, groupId)

    return { success: true, message: 'Invitations sent.' }
  } catch {
    return { success: false, message: 'Failed to send invitations.' }
  }
}

// Leader-only: rename the group (unique per section, max 50 chars).
export async function renameGroup(groupId: number, name: string) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const cleanName = name.trim()
  if (!cleanName) return { success: false, message: 'Group name is required.' }
  if (cleanName.length > 50) {
    return { success: false, message: 'Group name must be 50 characters or fewer.' }
  }

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: {
      group: { select: { id: true, leaderStudentId: true, sectionId: true } },
    },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.id !== groupId) {
    return { success: false, message: 'Not authorized.' }
  }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can rename the group.' }
  }

  const duplicate = await prisma.group.findFirst({
    where: {
      sectionId: student.group.sectionId,
      groupName: { equals: cleanName, mode: 'insensitive' },
      deletedAt: null,
      id: { not: groupId },
    },
    select: { id: true },
  })
  if (duplicate) {
    return {
      success: false,
      message: 'A group with this name already exists in your section.',
    }
  }

  try {
    await prisma.group.update({
      where: { id: groupId },
      data: { groupName: cleanName },
    })
    revalidateWorkspace(+session.user.id, groupId)
    return { success: true, message: 'Group renamed successfully.' }
  } catch {
    return { success: false, message: 'Failed to rename group.' }
  }
}

// Leader-only: remove a member from the group.
export async function removeGroupMember(memberId: number) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can remove members.' }
  }
  if (memberId === student.id) {
    return { success: false, message: 'You cannot remove yourself.' }
  }

  const member = await prisma.student.findFirst({
    where: { id: memberId, groupId: student.group.id, deletedAt: null },
    include: { user: { select: { id: true } } },
  })
  if (!member) return { success: false, message: 'Member not found in your group.' }

  try {
    await prisma.student.update({
      where: { id: memberId },
      data: { groupId: null },
    })
    revalidateWorkspace(+session.user.id, student.group.id)
    revalidateTag(`workspace-${member.user.id}`, 'max')
    revalidateTag(`classmates-${member.user.id}`, 'max')
    revalidateTag(`my-invitations-${member.user.id}`, 'max')
    return { success: true, message: 'Member removed from the group.' }
  } catch {
    return { success: false, message: 'Failed to remove member.' }
  }
}

// Leader-only: hand leadership to another member.
export async function transferLeadership(memberId: number) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can transfer leadership.' }
  }
  if (memberId === student.id) {
    return { success: false, message: 'You are already the group leader.' }
  }

  const member = await prisma.student.findFirst({
    where: { id: memberId, groupId: student.group.id, deletedAt: null },
    include: { user: { select: { id: true } } },
  })
  if (!member) return { success: false, message: 'Member not found in your group.' }

  try {
    await prisma.group.update({
      where: { id: student.group.id },
      data: { leaderStudentId: memberId },
    })
    revalidateWorkspace(+session.user.id, student.group.id)
    revalidateTag(`workspace-${member.user.id}`, 'max')
    return { success: true, message: 'Leadership transferred successfully.' }
  } catch {
    return { success: false, message: 'Failed to transfer leadership.' }
  }
}

// Non-leader only: leave the group. Leaders must transfer leadership first.
export async function leaveGroup() {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId === student.id) {
    return {
      success: false,
      message: 'Transfer leadership to another member before leaving.',
    }
  }

  try {
    await prisma.student.update({
      where: { id: student.id },
      data: { groupId: null },
    })
    const remaining = await prisma.student.count({
      where: { groupId: student.group.id, deletedAt: null },
    })
    if (remaining === 0) {
      await prisma.group.update({
        where: { id: student.group.id },
        data: { deletedAt: new Date() },
      })
    }
    revalidateWorkspace(+session.user.id, student.group.id)
    return { success: true, message: 'You left the group.' }
  } catch {
    return { success: false, message: 'Failed to leave the group.' }
  }
}

// Leader-only: cancel a pending GROUP invite.
export async function cancelGroupInvitation(invitationId: number) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can cancel invitations.' }
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      groupId: student.group.id,
      role: 'GROUP',
      status: 'PENDING',
      deletedAt: null,
    },
    include: { student: { select: { userId: true } } },
  })
  if (!invitation) return { success: false, message: 'Invitation not found.' }

  try {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    })
    revalidateWorkspace(+session.user.id, student.group.id)
    if (invitation.student?.userId) {
      revalidateTag(`my-invitations-${invitation.student.userId}`, 'max')
    }
    return { success: true, message: 'Invitation cancelled.' }
  } catch {
    return { success: false, message: 'Failed to cancel invitation.' }
  }
}

// Leader-only: send (or replace) an adviser-assignment invite to a faculty
// member. A new invite replaces the previous pending one.
export async function sendAdviserInvitation(facultyId: number) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: {
      group: { select: { id: true, leaderStudentId: true, adviserId: true } },
    },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can invite an adviser.' }
  }
  if (student.group.adviserId) {
    return {
      success: false,
      message: 'Your group already has an adviser.',
    }
  }

  const faculty = await prisma.faculty.findFirst({
    where: { id: facultyId, deletedAt: null },
    include: { user: { select: { id: true } } },
  })
  if (!faculty) return { success: false, message: 'Faculty not found.' }

  try {
    await prisma.invitation.updateMany({
      where: {
        groupId: student.group.id,
        role: 'ADVISER_ASSIGNMENT',
        status: 'PENDING',
      },
      data: { status: 'CANCELLED' },
    })
    const record = await prisma.invitation.create({
      data: {
        facultyId,
        groupId: student.group.id,
        role: 'ADVISER_ASSIGNMENT',
        invitedById: +session.user.id!,
        status: 'PENDING',
      },
    })
    revalidateWorkspace(+session.user.id, student.group.id)
    revalidateTag(`my-invitations-${faculty.user.id}`, 'max')
    revalidateAdviserCaches()
    return {
      success: true,
      message: 'Adviser invitation sent.',
      payload: { invitationId: record.id },
    }
  } catch {
    return { success: false, message: 'Failed to send invitation.' }
  }
}

// Leader-only: cancel the pending adviser-assignment invite.
export async function cancelAdviserInvitation(invitationId: number) {
  const session = await requireStudent()
  if (!session?.user?.id) return unauthorized

  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    include: { group: { select: { id: true, leaderStudentId: true } } },
  })
  if (!student?.group) return { success: false, message: 'You are not in a group.' }
  if (student.group.leaderStudentId !== student.id) {
    return { success: false, message: 'Only the group leader can cancel this invitation.' }
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      groupId: student.group.id,
      role: 'ADVISER_ASSIGNMENT',
      status: 'PENDING',
      deletedAt: null,
    },
    include: { faculty: { select: { userId: true } } },
  })
  if (!invitation) return { success: false, message: 'Invitation not found.' }

  try {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    })
    revalidateWorkspace(+session.user.id, student.group.id)
    if (invitation.faculty?.userId) {
      revalidateTag(`my-invitations-${invitation.faculty.userId}`, 'max')
    }
    revalidateAdviserCaches()
    return { success: true, message: 'Adviser invitation cancelled.' }
  } catch {
    return { success: false, message: 'Failed to cancel invitation.' }
  }
}
