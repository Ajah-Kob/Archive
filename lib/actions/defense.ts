'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import {
  requireCoordinatorAccess,
  requireAdminOrProgramChair,
  requirePanelist,
  unauthorized,
} from '@/lib/actions/guard'
import { getFacultyMembers } from '@/lib/actions/faculty'
import { revalidateFeature } from '@/lib/actions/revalidate'
import { audit } from '@/lib/actions/audit'
import type {
  DefenseType,
  DefenseVerdict,
  PanelistRole,
  DefenseReviewStatus,
} from '@prisma/client'

const DEFENSE_TYPES: DefenseType[] = ['PROPOSAL', 'FINAL']
const DEFENSE_VERDICTS: DefenseVerdict[] = [
  'PENDING',
  'APPROVED',
  'MINOR_REVISION',
  'MAJOR_REVISION',
  'REDEFENSE',
]
const PANELIST_ROLES: PanelistRole[] = ['CHAIR', 'PANEL_MEMBER']

// ───────────────────────────── Panelist session helpers (pure) ─────────────

type PanelistFeedback = { comments: number; pages: number; hasCommitted?: boolean; hasDraft?: boolean } | null

function resolvePanelistFeedbackFromAnnotations(
  rows: Array<{ status: string; data: unknown }>,
): PanelistFeedback {
  if (!rows || rows.length === 0) return null
  const committed = rows.find((r) => r.status === 'COMMITTED')
  const draft = rows.find((r) => r.status === 'DRAFT')
  const source = committed ?? draft ?? null
  if (!source) return null
  const items = Array.isArray(source.data) ? (source.data as unknown[]) : []
  const comments = items.length
  const pages = new Set(
    items.map((it) => (it as { annotation?: { pageIndex?: number } })?.annotation?.pageIndex).filter((v) => typeof v === 'number'),
  ).size
  return {
    comments,
    pages: pages || (comments > 0 ? 1 : 0),
    hasCommitted: committed != null && items.length > 0,
    hasDraft: draft != null && items.length > 0 && !committed,
  }
}

function toPanelistPayload(
  p: { userId: number; name: string; email: string; image: string | null; avatarGradient?: string | null; role: PanelistRole },
  verdict: DefenseVerdict,
  annotationRows: Array<{ status: string; data: unknown }> = [],
): DefensePanelistPayload {
  return {
    userId: p.userId,
    name: p.name,
    email: p.email,
    image: p.image,
    avatarGradient: p.avatarGradient ?? null,
    role: p.role,
    feedback: resolvePanelistFeedbackFromAnnotations(annotationRows),
  }
}

function mapGroupMembers(
  students: Array<{
    id: number
    user: { id: number; name: string; email: string; image: string | null; avatarGradient?: string | null }
  }>,
  leaderStudentId: number | null | undefined,
): DefenseMemberPayload[] {
  const mapped = students.map((s) => ({
    userId: s.user.id,
    name: s.user.name,
    email: s.user.email,
    image: s.user.image,
    avatarGradient: s.user.avatarGradient ?? null,
    isLeader: leaderStudentId != null && s.id === leaderStudentId,
  }))
  const leader = mapped.filter((m) => m.isLeader)
  const rest = mapped.filter((m) => !m.isLeader)
  return [...leader, ...rest]
}

interface PanelistInput {
  userId: number
  role: PanelistRole
}

// Validates the panelists JSON payload from the wizard. A defense is always
// manned by exactly one chair and two panel members, with no duplicates.
function parsePanelists(
  raw: string | null,
): { panelists: PanelistInput[] } | { error: string } {
  if (!raw) return { error: 'Panelists are required.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { error: 'Invalid panelists data.' }
  }
  if (!Array.isArray(parsed)) {
    return { error: 'Invalid panelists data.' }
  }

  const panelists: PanelistInput[] = []
  const seen = new Set<number>()
  for (const item of parsed) {
    const entry = item as { userId?: unknown; role?: unknown }
    if (!entry || typeof entry !== 'object') {
      return { error: 'Invalid panelist entry.' }
    }
    const userId = Number(entry.userId)
    const role = entry.role as string
    if (!Number.isInteger(userId) || !PANELIST_ROLES.includes(role as PanelistRole)) {
      return { error: 'Invalid panelist entry.' }
    }
    if (seen.has(userId)) {
      return { error: 'A panelist can only be assigned once.' }
    }
    seen.add(userId)
    panelists.push({ userId, role: role as PanelistRole })
  }

  const chairCount = panelists.filter((p) => p.role === 'CHAIR').length
  const memberCount = panelists.filter((p) => p.role === 'PANEL_MEMBER').length
  if (chairCount !== 1) {
    return { error: 'Exactly one chair is required.' }
  }
  if (memberCount !== 2) {
    return { error: 'Exactly two panel members are required.' }
  }
  return { panelists }
}

export interface DefensePanelistPayload {
  userId: number
  name: string
  email: string
  image: string | null
  avatarGradient?: string | null
  role: PanelistRole
  feedback?: { comments: number; pages: number; hasCommitted?: boolean; hasDraft?: boolean } | null
}

export interface DefenseMemberPayload {
  userId: number
  name: string
  email: string
  image: string | null
  avatarGradient?: string | null
  isLeader: boolean
}

export interface DefenseSchedulePayload {
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
  verdictSubmittedAt?: string | null
  createdById: number
  createdByName: string
  panelists: DefensePanelistPayload[]
  members: DefenseMemberPayload[]
  annotationStats?: { comments: number; pages: number } | null
}

async function getDefenseSchedulesData() {
  'use cache'
  cacheTag('defense')
  cacheLife('max')

  const schedules = await prisma.defenseSchedule.findMany({
    where: { deletedAt: null },
    include: {
      group: {
        include: {
          section: { select: { id: true, section: true } },
          leaderStudent: { select: { id: true } },
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
            include: { user: { select: { id: true, name: true, email: true, image: true, avatarGradient: true } } },
            orderBy: { id: 'asc' },
          },
        },
      },
      panelists: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, name: true, email: true, image: true, avatarGradient: true } } },
        orderBy: { role: 'asc' },
      },
      createdByUser: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  return schedules.map(
    (s): DefenseSchedulePayload => ({
      id: s.id,
      groupId: s.groupId,
      groupName: s.group.groupName,
      sectionName: s.group.section.section,
      adviserName: s.group.adviser?.faculty.user.name ?? null,
      type: s.type,
      date: s.date.toISOString(),
      startTime: s.startTime,
      endTime: s.endTime,
      venue: s.venue,
      verdict: s.verdict,
      createdById: s.createdBy,
      createdByName: s.createdByUser.name,
      panelists: s.panelists.map((p) =>
        toPanelistPayload(
          { userId: p.userId, name: p.user.name, email: p.user.email, image: p.user.image, avatarGradient: p.user.avatarGradient ?? null, role: p.role },
          s.verdict,
        ),
      ),
      members: mapGroupMembers(
        s.group.students as unknown as Array<{
          id: number
          user: { id: number; name: string; email: string; image: string | null; avatarGradient: string | null }
        }>,
        s.group.leaderStudentId,
      ),
    }),
  )
}

export async function getDefenseSchedules() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
  }

  try {
    const payload = await getDefenseSchedulesData()
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getDefenseSchedules | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch defense schedules',
      payload: null,
    }
  }
}

// ───────────────────────────── Panelist defense page ─────────────────────────

export interface MyDefenseSchedulePayload extends DefenseSchedulePayload {
  /** The current user's role on this schedule's panel (CHAIR / PANEL_MEMBER). */
  myRole: PanelistRole
}

// Schedules where the current user sits on the panel. Reuses the same
// 'defense' cache tag so any schedule mutation busts this read too.
async function getMyDefenseSchedulesData(
  userId: number,
): Promise<MyDefenseSchedulePayload[]> {
  'use cache'
  cacheTag('defense')
  cacheLife('max')

  const schedules = await prisma.defenseSchedule.findMany({
    where: {
      deletedAt: null,
      panelists: { some: { userId, deletedAt: null } },
    },
    include: {
      group: {
        include: {
          section: { select: { id: true, section: true } },
          leaderStudent: { select: { id: true } },
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
            include: { user: { select: { id: true, name: true, email: true, image: true, avatarGradient: true } } },
            orderBy: { id: 'asc' },
          },
        },
      },
      panelists: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, name: true, email: true, image: true, avatarGradient: true } } },
        orderBy: { role: 'asc' },
      },
      createdByUser: { select: { id: true, name: true } },
    },
    orderBy: { date: 'asc' },
  })

  return schedules.map(
    (s): MyDefenseSchedulePayload => ({
      id: s.id,
      groupId: s.groupId,
      groupName: s.group.groupName,
      sectionName: s.group.section.section,
      adviserName: s.group.adviser?.faculty.user.name ?? null,
      type: s.type,
      date: s.date.toISOString(),
      startTime: s.startTime,
      endTime: s.endTime,
      venue: s.venue,
      verdict: s.verdict,
      createdById: s.createdBy,
      createdByName: s.createdByUser.name,
      panelists: s.panelists.map((p) =>
        toPanelistPayload(
          { userId: p.userId, name: p.user.name, email: p.user.email, image: p.user.image, avatarGradient: p.user.avatarGradient ?? null, role: p.role },
          s.verdict,
        ),
      ),
      members: mapGroupMembers(
        s.group.students as unknown as Array<{
          id: number
          user: { id: number; name: string; email: string; image: string | null; avatarGradient: string | null }
        }>,
        s.group.leaderStudentId,
      ),
      myRole:
        s.panelists.find((p) => p.userId === userId)?.role ?? 'PANEL_MEMBER',
    }),
  )
}

export async function getMyDefenseSchedules() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
  }

  try {
    const payload = await getMyDefenseSchedulesData(+session.user.id)
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getMyDefenseSchedules | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch your defense schedules',
      payload: null,
    }
  }
}

// ───────────────────────────── Resubmissions tab ────────────────────────────

export interface DefenseQueuePayload {
  /** The review row id — the unit the panelist acts on. */
  id: number
  resubmissionId: number
  /** Alias for resubmissionId — the unified DefenseSubmission id. */
  submissionId: number
  scheduleId: number
  groupId: number
  groupName: string
  sectionName: string
  /** The defense verdict that triggered the revision (MINOR / MAJOR). */
  previousVerdict: 'MINOR_REVISION' | 'MAJOR_REVISION'
  /** The original defense date (context for the resubmission timeline). */
  defenseDate: string
  /** When the revised document was submitted. */
  dateSubmitted: string
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
  version: number
  isInitial: boolean
}

// The current user's personal revision-evaluation queue: submissions where
// they are an assigned panelist AND still need to review the new version
// (status PENDING). Unified model — queries DefenseSubmissionReview.
// Reuses the 'defense' cache tag so any schedule/submission mutation busts
// this read too.
function toQueuePayload(
  r: {
    id: number
    submissionId: number
    createdAt: Date
    submission: {
      scheduleId: number
      fileName: string
      blobUrl: string
      mimeType: string
      size: number
      version: number
      isInitial: boolean
      createdAt: Date
      schedule: {
        groupId: number
        verdict: string
        date: Date
        group: { groupName: string; section: { section: string } }
      }
    }
  },
): DefenseQueuePayload {
  return {
    id: r.id,
    resubmissionId: r.submissionId,
    submissionId: r.submissionId,
    scheduleId: r.submission.scheduleId,
    groupId: r.submission.schedule.groupId,
    groupName: r.submission.schedule.group.groupName,
    sectionName: r.submission.schedule.group.section.section,
    previousVerdict:
      r.submission.schedule.verdict === 'MAJOR_REVISION'
        ? 'MAJOR_REVISION'
        : 'MINOR_REVISION',
    defenseDate: r.submission.schedule.date.toISOString(),
    dateSubmitted: r.submission.createdAt.toISOString(),
    fileName: r.submission.fileName,
    blobUrl: r.submission.blobUrl,
    mimeType: r.submission.mimeType,
    size: r.submission.size,
    version: r.submission.version,
    isInitial: r.submission.isInitial,
  }
}

async function getMyDefenseResubmissionsData(
  userId: number,
): Promise<DefenseQueuePayload[]> {
  'use cache'
  cacheTag('defense')
  cacheLife('max')
  const reviews = await prisma.defenseSubmissionReview.findMany({
    where: {
      panelistId: userId,
      status: 'PENDING',
      deletedAt: null,
      submission: { deletedAt: null, schedule: { deletedAt: null } },
    },
    include: {
      submission: {
        include: {
          schedule: {
            include: {
              group: { include: { section: { select: { section: true } } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return reviews.map(toQueuePayload)
}

export async function getMyDefenseResubmissions() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
  }

  try {
    const payload = await getMyDefenseResubmissionsData(+session.user.id)
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getMyDefenseResubmissions | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch your resubmissions',
      payload: null,
    }
  }
}

// Options for the panelist wizard: all live faculty users. Reuses the existing
// faculty action (same cache tag) so the list stays in sync with faculty
// revalidation instead of duplicating the query.
export async function getFacultyForPanelists() {
  const res = await getFacultyMembers()
  if (!res.success || !res.payload) {
    return {
      success: false,
      message: 'Failed to fetch faculty',
      payload: null,
    }
  }
  const payload = res.payload.map((f) => ({
    id: f.userId,
    name: f.name,
    email: f.email,
  }))
  return { success: true, message: '', payload }
}

// ───────────────────────────── Wizard options ─────────────────────────────

export interface DefenseWizardSection {
  id: number
  name: string
}

export interface DefenseWizardGroup {
  id: number
  name: string
  sectionId: number
  hasSchedule: boolean
  /** Defense types with a live schedule — drives per-type eligibility. */
  scheduledTypes: DefenseType[]
}

export interface DefenseWizardOptionsPayload {
  sections: DefenseWizardSection[]
  groups: DefenseWizardGroup[]
}

// Sections + groups for the creation wizard. Every live section/group is
// included (admins and the program chair share this page alongside
// coordinators) and groups are flagged with whether a defense already exists
// so the wizard can disable them. Same cache tag as getDefenseSchedules:
// any defense mutation busts both reads with one revalidation.
async function getDefenseWizardOptionsData(
  coordinatorId?: number,
): Promise<DefenseWizardOptionsPayload> {
  const sections = await prisma.section.findMany({
    where: coordinatorId
      ? { coordinatorId, deletedAt: null }
      : { deletedAt: null },
    select: {
      id: true,
      section: true,
      groups: {
        where: { deletedAt: null },
        select: {
          id: true,
          groupName: true,
          defenseSchedules: {
            where: { deletedAt: null },
            select: { id: true, type: true },
          },
        },
      },
    },
    orderBy: { section: 'asc' },
  })

  return {
    sections: sections.map((s) => ({ id: s.id, name: s.section })),
    groups: sections.flatMap((s) =>
      s.groups.map((g) => ({
        id: g.id,
        name: g.groupName,
        sectionId: s.id,
        hasSchedule: g.defenseSchedules.length > 0,
        scheduledTypes: Array.from(
          new Set(g.defenseSchedules.map((d) => d.type)),
        ),
      })),
    ),
  }
}

export async function getDefenseWizardOptions() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
  }

  const role = (session.user.role as string) ?? ''
  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(role)

  // Coordinators see only their own sections; admins and the program chair
  // see all sections.
  let coordinatorId: number | undefined
  if (!isAdmin) {
    const coordinator = await prisma.coordinator.findFirst({
      where: {
        faculty: { userId: +session.user.id, deletedAt: null },
        deletedAt: null,
      },
      select: { id: true },
    })
    if (coordinator) coordinatorId = coordinator.id
  }

  try {
    const payload = await getDefenseWizardOptionsData(coordinatorId)
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getDefenseWizardOptions | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch defense options',
      payload: null,
    }
  }
}

export async function createDefenseSchedule(
  _prevState: any,
  formData: FormData,
) {
  const session = await requireCoordinatorAccess()
  if (!session) return unauthorized

  const groupId = parseInt(formData.get('groupId')?.toString() ?? '')
  if (Number.isNaN(groupId)) {
    return { success: false, message: 'Invalid group.' }
  }

  const group = await prisma.group.findFirst({
    where: { id: groupId, deletedAt: null },
    select: { id: true },
  })
  if (!group) {
    return { success: false, message: 'Group not found.' }
  }

  const type = formData.get('type')?.toString() ?? ''
  if (!DEFENSE_TYPES.includes(type as DefenseType)) {
    return { success: false, message: 'Invalid defense type.' }
  }

  const existing = await prisma.defenseSchedule.findFirst({
    where: { groupId, type: type as DefenseType, deletedAt: null },
    select: { id: true },
  })
  if (existing) {
    return {
      success: false,
      message: 'This group already has a defense schedule of this type.',
    }
  }

  const dateRaw = formData.get('date')?.toString().trim() ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return { success: false, message: 'Invalid defense date.' }
  }
  const date = new Date(dateRaw)
  if (Number.isNaN(date.getTime())) {
    return { success: false, message: 'Invalid defense date.' }
  }

  const startTime = formData.get('startTime')?.toString().trim() ?? ''
  if (!startTime) {
    return { success: false, message: 'Start time is required.' }
  }
  const endTime = formData.get('endTime')?.toString().trim() ?? ''
  if (!endTime) {
    return { success: false, message: 'End time is required.' }
  }
  const venue = formData.get('venue')?.toString().trim() ?? ''
  if (!venue) {
    return { success: false, message: 'Venue is required.' }
  }

  const parsed = parsePanelists(formData.get('panelists')?.toString() ?? null)
  if ('error' in parsed) {
    return { success: false, message: parsed.error }
  }

  try {
    const schedule = await prisma.$transaction(async (tx) => {
      return tx.defenseSchedule.create({
        data: {
          groupId,
          type: type as DefenseType,
          date,
          startTime,
          endTime,
          venue,
          createdBy: +session.user.id,
          panelists: {
            create: parsed.panelists.map((p) => ({
              userId: p.userId,
              role: p.role,
            })),
          },
        },
        include: { panelists: true },
      })
    })

    try {
      const groupForAudit = await prisma.group.findFirst({ where: { id: groupId }, select: { groupName: true } })
      await audit({
        action: "DEFENSE_SCHEDULE_CREATE",
        entity: "DEFENSE_SCHEDULE",
        entityId: String(schedule.id),
        entityName: groupForAudit?.groupName ?? `Group ${groupId} - ${type}`,
        before: null,
        after: { groupId, type, date: date.toISOString(), startTime, endTime, venue, panelists: parsed.panelists },
      })
    } catch {}

    // Both the 'use cache' tag and the RSC paths must be invalidated so the
    // scheduling page (faculty/admins) sees the new schedule immediately.
    revalidateTag('defense', 'max')
    revalidateFeature('defense')

    return {
      success: true,
      message: 'Defense schedule created successfully.',
      payload: schedule,
    }
  } catch (error) {
    console.error('[createDefenseSchedule | Error]:', error)
    return { success: false, message: 'Failed to create defense schedule.' }
  }
}

export async function updateDefenseSchedule(
  _prevState: any,
  formData: FormData,
) {
  const session = await requireCoordinatorAccess()
  if (!session) return unauthorized

  const scheduleId = parseInt(formData.get('scheduleId')?.toString() ?? '')
  if (Number.isNaN(scheduleId)) {
    return { success: false, message: 'Invalid defense schedule.' }
  }

  try {
    const schedule = await prisma.defenseSchedule.findFirst({
      where: { id: scheduleId, deletedAt: null },
      select: { id: true, createdBy: true, type: true, date: true, startTime: true, endTime: true, venue: true, verdict: true, groupId: true },
    })
    if (!schedule) {
      return { success: false, message: 'Defense schedule not found.' }
    }

    // Snapshot before for audit diff.
    const beforeSnapshot = {
      type: schedule.type,
      date: schedule.date?.toISOString?.() ?? String(schedule.date),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      venue: schedule.venue,
      verdict: schedule.verdict,
      groupId: (schedule as any).groupId,
    }

    // Coordinators may only edit schedules they created; admins and the
    // program chair may edit any schedule (same bypass as sections.ts).
    const isOwner = schedule.createdBy === +session.user.id
    if (!isOwner && !(await requireAdminOrProgramChair())) {
      return unauthorized
    }

    const data: Partial<{
      type: DefenseType
      date: Date
      startTime: string
      endTime: string
      venue: string
      verdict: DefenseVerdict
    }> = {}

    const type = formData.get('type')?.toString().trim()
    if (type) {
      if (!DEFENSE_TYPES.includes(type as DefenseType)) {
        return { success: false, message: 'Invalid defense type.' }
      }
      data.type = type as DefenseType
    }

    const dateRaw = formData.get('date')?.toString().trim()
    if (dateRaw) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
        return { success: false, message: 'Invalid defense date.' }
      }
      const date = new Date(dateRaw)
      if (Number.isNaN(date.getTime())) {
        return { success: false, message: 'Invalid defense date.' }
      }
      data.date = date
    }

    const startTime = formData.get('startTime')?.toString().trim()
    if (startTime) data.startTime = startTime
    const endTime = formData.get('endTime')?.toString().trim()
    if (endTime) data.endTime = endTime
    const venue = formData.get('venue')?.toString().trim()
    if (venue) data.venue = venue

    const verdict = formData.get('verdict')?.toString().trim()
    if (verdict) {
      if (!DEFENSE_VERDICTS.includes(verdict as DefenseVerdict)) {
        return { success: false, message: 'Invalid verdict.' }
      }
      data.verdict = verdict as DefenseVerdict
    }

    let panelists: PanelistInput[] | null = null
    const panelistsRaw = formData.get('panelists')?.toString()
    if (panelistsRaw) {
      const parsed = parsePanelists(panelistsRaw)
      if ('error' in parsed) {
        return { success: false, message: parsed.error }
      }
      panelists = parsed.panelists
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (panelists) {
        // Replace the panel: soft-delete the current rows, then recreate.
        await tx.defensePanelist.updateMany({
          where: { defenseScheduleId: schedule.id, deletedAt: null },
          data: { deletedAt: new Date() },
        })
      }
      return tx.defenseSchedule.update({
        where: { id: schedule.id },
        data: {
          ...data,
          ...(panelists
            ? {
                panelists: {
                  create: panelists.map((p) => ({
                    userId: p.userId,
                    role: p.role,
                  })),
                },
              }
            : {}),
        },
        include: { panelists: true, group: { select: { groupName: true } } },
      })
    })

    try {
      const groupNameForAudit = (updated as any).group?.groupName ?? `Group ${(schedule as any).groupId ?? scheduleId}`
      await audit({
        action: "DEFENSE_SCHEDULE_UPDATE",
        entity: "DEFENSE_SCHEDULE",
        entityId: String(schedule.id),
        entityName: groupNameForAudit,
        before: beforeSnapshot,
        after: { ...data, panelists: panelists ?? undefined },
      })
    } catch {}

    revalidateTag('defense', 'max')
    revalidateFeature('defense')

    return {
      success: true,
      message: 'Defense schedule updated successfully.',
      payload: updated,
    }
  } catch (error) {
    console.error('[updateDefenseSchedule | Error]:', error)
    return { success: false, message: 'Failed to update defense schedule.' }
  }
}

export async function deleteDefenseSchedule(id: number) {
  const session = await requireCoordinatorAccess()
  if (!session) return unauthorized

  try {
    const schedule = await prisma.defenseSchedule.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, createdBy: true, type: true, groupId: true, group: { select: { groupName: true } } },
    })
    if (!schedule) {
      return { success: false, message: 'Defense schedule not found.' }
    }
    if (schedule.createdBy !== +session.user.id) {
      return unauthorized
    }

    const beforeForAudit = { id: schedule.id, type: (schedule as any).type, groupId: (schedule as any).groupId, groupName: (schedule as any).group?.groupName ?? null }
    const entityNameForAudit = (schedule as any).group?.groupName ?? `Group ${(schedule as any).groupId ?? id} - ${(schedule as any).type ?? 'Defense'}`

    const now = new Date()
    await prisma.$transaction([
      prisma.defensePanelist.updateMany({
        where: { defenseScheduleId: schedule.id },
        data: { deletedAt: now },
      }),
      prisma.defenseSchedule.update({
        where: { id: schedule.id },
        data: { deletedAt: now },
      }),
    ])

    try {
      await audit({
        action: "DEFENSE_SCHEDULE_DELETE",
        entity: "DEFENSE_SCHEDULE",
        entityId: String(schedule.id),
        entityName: entityNameForAudit,
        before: beforeForAudit,
        after: { deletedAt: now.toISOString() },
      })
    } catch {}

    revalidateTag('defense', 'max')
    revalidateFeature('defense')

    return { success: true, message: 'Defense schedule deleted.' }
  } catch (error) {
    console.error('[deleteDefenseSchedule | Error]:', error)
    return { success: false, message: 'Failed to delete defense schedule.' }
  }
}

// ───────────────────────────── Redefense reschedule ────────────────────────────

/**
 * Coordinator creates a fresh defense schedule for a REDEFENSE verdict.
 * - Authenticates via requireCoordinatorAccess; only the schedule owner,
 *   an admin, or the program chair may reschedule (same rule as update).
 * - Requires the source schedule to be live with verdict REDEFENSE.
 * - Soft-deletes the old schedule as history (submissions + reviews stay
 *   attached to it, read-only) and creates a new PENDING schedule of the
 *   same type. The group uploads a fresh document for the new cycle.
 * - Panelists come from the form when provided, otherwise carried over
 *   from the old schedule.
 * Returns { success, message, payload } — never throws.
 */
export async function rescheduleForRedefense(
  _prevState: any,
  formData: FormData,
) {
  const session = await requireCoordinatorAccess()
  if (!session) return unauthorized

  const scheduleId = parseInt(formData.get('scheduleId')?.toString() ?? '')
  if (Number.isNaN(scheduleId)) {
    return { success: false, message: 'Invalid defense schedule.' }
  }

  try {
    const schedule = await prisma.defenseSchedule.findFirst({
      where: { id: scheduleId, deletedAt: null },
      include: {
        panelists: {
          where: { deletedAt: null },
          select: { userId: true, role: true },
        },
        group: { select: { id: true, groupName: true } },
      },
    })
    if (!schedule) {
      return { success: false, message: 'Defense schedule not found.' }
    }
    if (schedule.verdict !== 'REDEFENSE') {
      return {
        success: false,
        message: 'Only schedules with a Redefense verdict can be rescheduled this way.',
      }
    }

    const isOwner = schedule.createdBy === +session.user.id
    if (!isOwner && !(await requireAdminOrProgramChair())) {
      return unauthorized
    }

    const dateRaw = formData.get('date')?.toString().trim() ?? ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      return { success: false, message: 'Invalid defense date.' }
    }
    const date = new Date(dateRaw)
    if (Number.isNaN(date.getTime())) {
      return { success: false, message: 'Invalid defense date.' }
    }
    const startTime = formData.get('startTime')?.toString().trim() ?? ''
    if (!startTime) {
      return { success: false, message: 'Start time is required.' }
    }
    const endTime = formData.get('endTime')?.toString().trim() ?? ''
    if (!endTime) {
      return { success: false, message: 'End time is required.' }
    }
    const venue = formData.get('venue')?.toString().trim() ?? ''
    if (!venue) {
      return { success: false, message: 'Venue is required.' }
    }

    // Panelists: explicit form value wins, otherwise carry over the old panel.
    let panelists: PanelistInput[]
    const panelistsRaw = formData.get('panelists')?.toString()
    if (panelistsRaw) {
      const parsed = parsePanelists(panelistsRaw)
      if ('error' in parsed) {
        return { success: false, message: parsed.error }
      }
      panelists = parsed.panelists
    } else {
      panelists = schedule.panelists.map((p) => ({
        userId: p.userId,
        role: p.role,
      }))
    }
    if (panelists.length === 0) {
      return { success: false, message: 'At least one panelist is required.' }
    }

    const now = new Date()
    const created = await prisma.$transaction(async (tx) => {
      await tx.defenseSchedule.update({
        where: { id: schedule.id },
        data: { deletedAt: now },
      })
      return tx.defenseSchedule.create({
        data: {
          groupId: schedule.groupId,
          type: schedule.type,
          date,
          startTime,
          endTime,
          venue,
          createdBy: +session.user.id,
          panelists: {
            create: panelists.map((p) => ({
              userId: p.userId,
              role: p.role,
            })),
          },
        },
        include: { panelists: true },
      })
    })

    const groupName = schedule.group?.groupName ?? `Group ${schedule.groupId} - ${schedule.type}`
    try {
      await audit({
        action: 'DEFENSE_RESCHEDULE',
        entity: 'DEFENSE_SCHEDULE',
        entityId: String(created.id),
        entityName: groupName,
        before: { rescheduledFromId: schedule.id, verdict: schedule.verdict },
        after: {
          groupId: schedule.groupId,
          type: schedule.type,
          date: date.toISOString(),
          startTime,
          endTime,
          venue,
          panelists,
        },
      })
    } catch {}

    // Notify every group member so they learn the new date/venue.
    try {
      const members = await prisma.student.findMany({
        where: { groupId: schedule.groupId, deletedAt: null },
        select: { userId: true },
      })
      const milestoneSlug =
        schedule.type === 'FINAL' ? 'final-defense' : 'proposal-defense'
      if (members.length > 0) {
        await prisma.notification.createMany({
          data: members.map((m) => ({
            userId: m.userId,
            title: 'Defense rescheduled',
            body: `${groupName} has a new ${schedule.type === 'FINAL' ? 'final' : 'proposal'} defense on ${dateRaw} at ${venue}.`,
            href: `/student/milestone/${milestoneSlug}`,
          })),
        })
      }
    } catch (notifyError) {
      console.error('[rescheduleForRedefense | notify Error]:', notifyError)
    }

    revalidateTag('defense', 'max')
    revalidateFeature('defense')

    return {
      success: true,
      message: 'Redefense rescheduled successfully.',
      payload: created,
    }
  } catch (error) {
    console.error('[rescheduleForRedefense | Error]:', error)
    return { success: false, message: 'Failed to reschedule defense.' }
  }
}

// ───────────────────────────── Defense history (read-only reference) ─────────

/**
 * Lists a group's past (soft-deleted) defense schedules with submitted
 * verdicts, newest first, each with its submissions for reference.
 * Visible to group members, the section coordinator, panelists, admins,
 * and the program chair. Everything served here is read-only.
 */
export async function getPastDefenseSchedules(groupId: number) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, payload: null, message: 'Not authorized' }
  }
  if (!Number.isInteger(groupId)) {
    return { success: false, payload: null, message: 'Invalid group.' }
  }
  const userId = +session.user.id

  try {
    const group = await prisma.group.findFirst({
      where: { id: groupId, deletedAt: null },
      select: {
        id: true,
        section: {
          select: {
            coordinator: {
              select: { faculty: { select: { userId: true } } },
            },
          },
        },
        students: {
          where: { deletedAt: null },
          select: { userId: true },
        },
      },
    })
    if (!group) {
      return { success: false, payload: null, message: 'Group not found.' }
    }

    const role = (session.user as { role?: string }).role
    const isAdminLike =
      role === 'SUPERADMIN' ||
      role === 'ADMIN' ||
      (await requireAdminOrProgramChair()) !== null
    const isMember = group.students.some((s) => s.userId === userId)
    const isCoordinator =
      group.section?.coordinator?.faculty?.userId === userId
    const isPanelist =
      !isMember && !isCoordinator && !isAdminLike
        ? (await prisma.defensePanelist.findFirst({
            where: {
              userId,
              deletedAt: null,
              defenseSchedule: { groupId, deletedAt: null },
            },
            select: { id: true },
          })) !== null
        : false

    if (!isAdminLike && !isMember && !isCoordinator && !isPanelist) {
      return { success: false, payload: null, message: 'Not authorized' }
    }

    const schedules = await prisma.defenseSchedule.findMany({
      where: {
        groupId,
        deletedAt: { not: null },
        verdict: { not: 'PENDING' },
      },
      select: {
        id: true,
        type: true,
        date: true,
        venue: true,
        verdict: true,
        verdictSubmittedAt: true,
        deletedAt: true,
        submissions: {
          where: { deletedAt: null },
          select: {
            id: true,
            version: true,
            isInitial: true,
            fileName: true,
            blobUrl: true,
            size: true,
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { version: 'desc' },
        },
      },
      orderBy: { date: 'desc' },
    })

    return {
      success: true,
      payload: schedules.map((s) => ({
        id: s.id,
        type: s.type,
        date: s.date.toISOString(),
        venue: s.venue,
        verdict: s.verdict,
        verdictSubmittedAt: s.verdictSubmittedAt?.toISOString() ?? null,
        submissions: s.submissions.map((sub) => ({
          id: sub.id,
          version: sub.version,
          isInitial: sub.isInitial,
          fileName: sub.fileName,
          blobUrl: sub.blobUrl,
          size: sub.size,
          submittedByName: sub.user?.name ?? 'Unknown',
          dateSubmitted: sub.createdAt.toISOString(),
        })),
      })),
    }
  } catch (error) {
    console.error('[getPastDefenseSchedules | Error]:', error)
    return { success: false, payload: null, message: 'Failed to load defense history.' }
  }
}

// ───────────────────────────── Chair verdict (awaiting-chair callout) ───────────

const CHAIR_VERDICTS: DefenseVerdict[] = ['APPROVED', 'MINOR_REVISION', 'MAJOR_REVISION', 'REDEFENSE']

function isChairVerdict(value: string): value is DefenseVerdict {
  return (CHAIR_VERDICTS as string[]).includes(value)
}

/**
 * Panel Chair submits the final defense verdict.
 * - Authenticates via requirePanelist (any panelist may reach this action)
 * - Authorizes only the CHAIR for the given schedule (DefensePanelist role === CHAIR)
 * - Validates verdict is one of APPROVED / MINOR_REVISION / MAJOR_REVISION / REDEFENSE
 * - Allows submit only when current verdict is PENDING (no overwrite)
 * Returns { success, message, payload } — never throws.
 */
export async function submitPanelistVerdict(scheduleId: number, verdict: string) {
  const session = await requirePanelist()
  if (!session) return unauthorized

  if (!Number.isInteger(scheduleId)) {
    return { success: false, message: 'Invalid defense schedule.', payload: null }
  }

  if (!isChairVerdict(verdict)) {
    return { success: false, message: 'Invalid verdict.', payload: null }
  }

  try {
    const chairRow = await prisma.defensePanelist.findFirst({
      where: { defenseScheduleId: scheduleId, userId: +session.user.id, role: 'CHAIR', deletedAt: null },
      select: { id: true },
    })
    if (!chairRow) {
      return { success: false, message: 'Only the Panel Chair can submit the verdict.', payload: null }
    }

    const schedule = await prisma.defenseSchedule.findFirst({
      where: { id: scheduleId, deletedAt: null },
      select: { id: true, verdict: true },
    })
    if (!schedule) {
      return { success: false, message: 'Defense schedule not found.', payload: null }
    }
    if (schedule.verdict !== 'PENDING') {
      return { success: false, message: 'Verdict already submitted.', payload: null }
    }

    const now = new Date()
    const beforeVerdict = schedule.verdict
    const updated = await prisma.defenseSchedule.update({
      where: { id: scheduleId },
      data: { verdict: verdict as DefenseVerdict, verdictSubmittedAt: now },
    })

    try {
      // Resolve group name for human-readable entityName (best-effort).
      let groupNameForVerdict: string | null = null
      try {
        const s = await prisma.defenseSchedule.findFirst({ where: { id: scheduleId }, select: { group: { select: { groupName: true } } } })
        groupNameForVerdict = (s as any)?.group?.groupName ?? null
      } catch {}
      await audit({
        action: "DEFENSE_VERDICT",
        entity: "DEFENSE_SCHEDULE",
        entityId: String(scheduleId),
        entityName: groupNameForVerdict ?? `Schedule ${scheduleId}`,
        before: { verdict: beforeVerdict },
        after: { verdict, verdictSubmittedAt: now.toISOString() },
      })
    } catch {}

    revalidateTag('defense', 'max')
    revalidateFeature('defense')

    // The student defense readers are cached under per-submission (+per-user)
    // tags that 'defense' does not cover — without busting them, the student
    // workspace keeps serving the pre-verdict payload indefinitely. Resolve
    // the affected submissions + group members and invalidate each variant.
    // Best-effort: a lookup failure must never fail the verdict itself.
    try {
      const affected = await prisma.defenseSchedule.findFirst({
        where: { id: scheduleId },
        select: {
          submissions: {
            where: { deletedAt: null },
            select: { id: true },
          },
          group: {
            select: {
              students: {
                where: { deletedAt: null },
                select: { userId: true },
              },
            },
          },
        },
      })
      const memberUserIds = [
        ...new Set(
          (affected?.group.students ?? [])
            .map((s) => s.userId)
            .filter((id): id is number => Number.isInteger(id)),
        ),
      ]
      for (const submission of affected?.submissions ?? []) {
        revalidateTag(`defense-submission-${submission.id}-detail`, 'max')
        revalidateTag(`defense-submission-${submission.id}-annotations`, 'max')
        for (const userId of memberUserIds) {
          revalidateTag(`defense-student-detail-${submission.id}-${userId}`, 'max')
          revalidateTag(`defense-student-annotations-${submission.id}-${userId}`, 'max')
          revalidateTag(`defense-student-versions-${submission.id}-${userId}`, 'max')
        }
      }
    } catch (revalidateError) {
      console.error('[submitPanelistVerdict | revalidate students | Error]:', revalidateError)
    }

    return { success: true, message: 'Verdict submitted successfully.', payload: updated }
  } catch (error) {
    return { success: false, message: 'Failed to submit verdict.', payload: null }
  }
}

/**
 * FormData variant for useActionState compatibility.
 * Expects formData with scheduleId and verdict.
 */
export async function submitPanelistVerdictAction(_prevState: any, formData: FormData) {
  const scheduleId = parseInt(formData.get('scheduleId')?.toString() ?? '', 10)
  const verdict = formData.get('verdict')?.toString() ?? ''
  return submitPanelistVerdict(scheduleId, verdict)
}

// ───────────────────────────── Resubmission review (approve / request revision) ───

/**
 * Panelist reviews a resubmitted defense document (isInitial === false).
 * - Authenticates via requirePanelist (any panelist on the schedule)
 * - Authorizes that the submission is a resubmission and the panelist has a PENDING review row
 * - Enforces read-only: a panelist who already APPROVED the initial version cannot re-review future resubmissions (carry-forward)
 * - On success updates DefenseSubmissionReview to APPROVED or REDEFENSE and commits annotations (if provided)
 * Returns { success, message } — never throws.
 */
export async function reviewDefenseResubmission(
  submissionId: number,
  decision: 'APPROVED' | 'REDEFENSE' | 'NEED_REVISION',
  annotationData: unknown = null,
) {
  const session = await requirePanelist()
  if (!session) return unauthorized

  const panelistId = +session.user.id
  const normalizedDecision = decision === 'NEED_REVISION' ? 'REDEFENSE' : decision
  if (normalizedDecision !== 'APPROVED' && normalizedDecision !== 'REDEFENSE') {
    return { success: false, message: 'Invalid decision.' }
  }

  if (!Number.isInteger(submissionId)) {
    return { success: false, message: 'Invalid submission.' }
  }

  try {
    const submission = await prisma.defenseSubmission.findFirst({
      where: { id: submissionId, deletedAt: null },
      select: {
        id: true,
        isInitial: true,
        scheduleId: true,
        schedule: { select: { verdict: true } },
      },
    })
    if (!submission) {
      return { success: false, message: 'Submission not found.' }
    }
    if (submission.isInitial) {
      return { success: false, message: 'Only resubmitted documents can be reviewed this way.' }
    }

    // Verify the caller is a panelist on this schedule
    const panelistRow = await prisma.defensePanelist.findFirst({
      where: { defenseScheduleId: submission.scheduleId, userId: panelistId, deletedAt: null },
      select: { id: true },
    })
    if (!panelistRow) {
      return { success: false, message: 'You are not a panelist on this defense.' }
    }

    // Enforce read-only for panelists who already approved the initial version (carry-forward)
    const initialSubmission = await prisma.defenseSubmission.findFirst({
      where: { scheduleId: submission.scheduleId, isInitial: true, deletedAt: null },
      select: { id: true },
    })
    if (initialSubmission) {
      const initialReview = await prisma.defenseSubmissionReview.findFirst({
        where: { submissionId: initialSubmission.id, panelistId, deletedAt: null },
        select: { status: true },
      })
      const { isPanelistReadOnly } = await import('@/lib/defense/session-helpers')
      if (initialReview && isPanelistReadOnly(initialReview.status as DefenseReviewStatus)) {
        return { success: false, message: 'You have already approved the initial document and cannot review resubmissions.' }
      }
    }

    const review = await prisma.defenseSubmissionReview.findFirst({
      where: { submissionId, panelistId, deletedAt: null },
      select: { id: true, status: true },
    })
    if (!review) {
      return { success: false, message: 'Review assignment not found.' }
    }
    if (review.status !== 'PENDING') {
      return { success: false, message: 'This document has already been reviewed.' }
    }

    const now = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.defenseSubmissionReview.update({
        where: { id: review.id },
        data: { status: normalizedDecision as DefenseReviewStatus, reviewedAt: now },
      })
      if (annotationData != null) {
        await (tx as unknown as { defenseSubmissionAnnotation: { upsert: (args: unknown) => Promise<unknown> } }).defenseSubmissionAnnotation.upsert({
          where: { submissionId_authorId: { submissionId, authorId: panelistId } },
          create: {
            submissionId,
            authorId: panelistId,
            data: annotationData as never,
            status: 'COMMITTED',
          },
          update: {
            data: annotationData as never,
            status: 'COMMITTED',
          },
        } as never)
      }
    })

    revalidateTag('defense', 'max')
    revalidateFeature('defense')

    return {
      success: true,
      message: normalizedDecision === 'APPROVED' ? 'Resubmission approved.' : 'Revision requested for resubmission.',
    }
  } catch (error) {
    console.error('[reviewDefenseResubmission | Error]:', error)
    return { success: false, message: 'Failed to review the resubmission.' }
  }
}

// ───────────────────────────── Defense session workspace ─────────────────────

export interface DefenseSessionSubmissionPayload {
  id: number
  /** Version ordinal — mirrors DefenseSubmission.version (1 is initial, 2+ are resubmissions). */
  version: number
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
  /** When this version was submitted. */
  dateSubmitted: string
  isInitial: boolean
  annotationStats?: { comments: number; pages: number } | null
  /** Per-panelist review state for this version. */
  reviews: {
    panelistId: number
    name: string
    status: DefenseReviewStatus
  }[]
}

export interface DefenseSessionPayload extends MyDefenseSchedulePayload {
  /** The current user's role on this schedule's panel (CHAIR / PANEL_MEMBER). */
  myRole: PanelistRole
  /** Submission history — initial document first, then resubmissions (filtered from unified DefenseSubmission). */
  resubmissions: DefenseSessionSubmissionPayload[]
  /** Full submission history including initial (isInitial=true, v1) + resubmissions — used by panelist Initial card. */
  submissions: DefenseSessionSubmissionPayload[]
}

// A single defense session for the workspace page. Returns the schedule with
// its group, section, panel, and full submission history (initial document +
// every resubmission with per-panelist review state). Unified model — reads
// DefenseSubmission (filtered to resubmissions for the `resubmissions` field).
// Reuses the 'defense' cache tag so any schedule/submission mutation busts
// this read too.
async function getDefenseSessionData(
  scheduleId: number,
  userId: number,
): Promise<DefenseSessionPayload | null> {
  'use cache'
  cacheTag('defense')
  cacheLife('max')

  const schedule = await prisma.defenseSchedule.findFirst({
    where: { id: scheduleId, deletedAt: null },
    include: {
      group: {
        include: {
          section: { select: { id: true, section: true } },
          leaderStudent: { select: { id: true } },
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
            include: { user: { select: { id: true, name: true, email: true, image: true, avatarGradient: true } } },
            orderBy: { id: 'asc' },
          },
        },
      },
      panelists: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, name: true, email: true, image: true, avatarGradient: true } } },
        orderBy: { role: 'asc' },
      },
      createdByUser: { select: { id: true, name: true } },
      submissions: {
        where: { deletedAt: null },
        include: {
          reviews: {
            where: { deletedAt: null },
            include: { panelist: { select: { id: true, name: true } } },
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
    createdById: schedule.createdBy,
    createdByName: schedule.createdByUser.name,
    annotationStats: (() => {
      // Feedback indicator is for the initial defense document — never reset on resubmission.
      const initial = (schedule.submissions.find((s) => (s as unknown as { isInitial: boolean }).isInitial) ?? schedule.submissions[0]) as unknown as { annotations?: Array<{ data: unknown }> } | undefined
      if (!initial?.annotations || initial.annotations.length === 0) return null
      const allItems = initial.annotations.flatMap((a) => (Array.isArray(a.data) ? (a.data as unknown[]) : []))
      if (allItems.length === 0) return null
      const pages = new Set(
        allItems
          .map((it) => (it as unknown as { annotation?: { pageIndex?: number } })?.annotation?.pageIndex)
          .filter((v): v is number => typeof v === 'number'),
      ).size
      return { comments: allItems.length, pages: pages || 1 }
    })(),
    // Panelist feedback completion: derived from initial defense submission annotations — not reset when a resubmission (v2+) is created.
    panelists: (() => {
      const initial = (schedule.submissions.find((s) => (s as unknown as { isInitial: boolean }).isInitial) ?? schedule.submissions[0]) as unknown as { annotations?: Array<{ authorId: number; status: string; data: unknown }> } | undefined
      const byAuthor = new Map<number, Array<{ status: string; data: unknown }>>()
      if (initial?.annotations) {
        for (const a of initial.annotations) {
          const arr = byAuthor.get(a.authorId) ?? []
          arr.push({ status: a.status, data: a.data })
          byAuthor.set(a.authorId, arr)
        }
      }
      return schedule.panelists.map((p) =>
        toPanelistPayload(
          { userId: p.userId, name: p.user.name, email: p.user.email, image: p.user.image, avatarGradient: p.user.avatarGradient ?? null, role: p.role },
          schedule.verdict,
          byAuthor.get(p.userId) ?? [],
        ),
      )
    })(),
    members: mapGroupMembers(
      schedule.group.students as unknown as Array<{
        id: number
        user: { id: number; name: string; email: string; image: string | null; avatarGradient: string | null }
      }>,
      schedule.group.leaderStudentId,
    ),
    myRole:
      schedule.panelists.find((p) => p.userId === userId)?.role ?? 'PANEL_MEMBER',
    submissions: schedule.submissions.map((r) => {
      const rWithAnn = r as unknown as { annotations?: Array<{ authorId: number; data: unknown; status: string }> }
      let annStats: { comments: number; pages: number } | null = null
      if (rWithAnn.annotations && rWithAnn.annotations.length > 0) {
        const allItems = rWithAnn.annotations.flatMap((a) => (Array.isArray(a.data) ? (a.data as unknown[]) : []))
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
      if (rWithAnn.annotations) {
        for (const a of rWithAnn.annotations) {
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
        id: r.id,
        version: r.version,
        fileName: r.fileName,
        blobUrl: r.blobUrl,
        mimeType: r.mimeType,
        size: r.size,
        dateSubmitted: r.createdAt.toISOString(),
        isInitial: r.isInitial,
        annotationStats: annStats,
        reviews: r.reviews.map((review) => {
          const fb = annByAuthor.get(review.panelistId) ?? null
          return {
            panelistId: review.panelistId,
            name: review.panelist.name,
            status: review.status,
            reviewedAt: (review as unknown as { reviewedAt?: Date | null }).reviewedAt?.toISOString() ?? null,
            feedback: fb,
            comments: fb?.comments ?? 0,
            pages: fb?.pages ?? 0,
          }
        }),
      }
    }),
    resubmissions: schedule.submissions
      .filter((s) => !s.isInitial)
      .map((r) => {
        const rWithAnn = r as unknown as { annotations?: Array<{ authorId: number; data: unknown; status: string }> }
        let annStats: { comments: number; pages: number } | null = null
        if (rWithAnn.annotations && rWithAnn.annotations.length > 0) {
          const allItems = rWithAnn.annotations.flatMap((a) => (Array.isArray(a.data) ? (a.data as unknown[]) : []))
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
        if (rWithAnn.annotations) {
          for (const a of rWithAnn.annotations) {
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
          id: r.id,
          version: r.version,
          fileName: r.fileName,
          blobUrl: r.blobUrl,
          mimeType: r.mimeType,
          size: r.size,
          dateSubmitted: r.createdAt.toISOString(),
          isInitial: r.isInitial,
          annotationStats: annStats,
          reviews: r.reviews.map((review) => {
            const fb = annByAuthor.get(review.panelistId) ?? null
            return {
              panelistId: review.panelistId,
              name: review.panelist.name,
              status: review.status,
              reviewedAt: (review as unknown as { reviewedAt?: Date | null }).reviewedAt?.toISOString() ?? null,
              feedback: fb,
              comments: fb?.comments ?? 0,
              pages: fb?.pages ?? 0,
            }
          }),
        }
      }),
  }
}

export async function getDefenseSession(scheduleId: number) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: 'Not authenticated', payload: null }
  }

  try {
    const payload = await getDefenseSessionData(scheduleId, +session.user.id)
    if (!payload) {
      return { success: false, message: 'Defense session not found.', payload: null }
    }
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getDefenseSession | Error]:', error)
    return {
      success: false,
      message: 'Failed to fetch defense session',
      payload: null,
    }
  }
}
