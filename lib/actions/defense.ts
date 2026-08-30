'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import {
  requireCoordinatorAccess,
  requireAdminOrProgramChair,
  unauthorized,
} from '@/lib/actions/guard'
import { getFacultyMembers } from '@/lib/actions/faculty'
import { revalidateFeature } from '@/lib/actions/revalidate'
import type {
  DefenseType,
  DefenseVerdict,
  PanelistRole,
  DefenseResubmissionStatus,
} from '@prisma/client'

const DEFENSE_TYPES: DefenseType[] = ['PROPOSAL', 'FINAL']
const DEFENSE_VERDICTS: DefenseVerdict[] = [
  'PENDING',
  'APPROVED',
  'MINOR_REVISION',
  'MAJOR_REVISION',
  'REJECTED',
]
const PANELIST_ROLES: PanelistRole[] = ['CHAIR', 'PANEL_MEMBER']

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
  image: string | null
  role: PanelistRole
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
  createdById: number
  createdByName: string
  panelists: DefensePanelistPayload[]
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
        include: { user: { select: { id: true, name: true, image: true } } },
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
      panelists: s.panelists.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        image: p.user.image,
        role: p.role,
      })),
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
        include: { user: { select: { id: true, name: true, image: true } } },
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
      panelists: s.panelists.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        image: p.user.image,
        role: p.role,
      })),
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

export interface DefenseResubmissionPayload {
  /** The review row id — the unit the panelist acts on. */
  id: number
  resubmissionId: number
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
}

// The current user's personal revision-evaluation queue: resubmissions where
// they are an assigned panelist AND still need to review the new version
// (status PENDING). Reuses the 'defense' cache tag so any schedule/resubmission
// mutation busts this read too.
async function getMyDefenseResubmissionsData(
  userId: number,
): Promise<DefenseResubmissionPayload[]> {
  'use cache'
  cacheTag('defense')
  cacheLife('max')

  const reviews = await prisma.defenseResubmissionReview.findMany({
    where: {
      panelistId: userId,
      status: 'PENDING',
      deletedAt: null,
      resubmission: {
        deletedAt: null,
        schedule: { deletedAt: null },
      },
    },
    include: {
      resubmission: {
        include: {
          schedule: {
            include: {
              group: {
                include: {
                  section: { select: { section: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return reviews.map(
    (r): DefenseResubmissionPayload => ({
      id: r.id,
      resubmissionId: r.resubmissionId,
      scheduleId: r.resubmission.scheduleId,
      groupId: r.resubmission.schedule.groupId,
      groupName: r.resubmission.schedule.group.groupName,
      sectionName: r.resubmission.schedule.group.section.section,
      previousVerdict:
        r.resubmission.schedule.verdict === 'MAJOR_REVISION'
          ? 'MAJOR_REVISION'
          : 'MINOR_REVISION',
      defenseDate: r.resubmission.schedule.date.toISOString(),
      dateSubmitted: r.resubmission.createdAt.toISOString(),
      fileName: r.resubmission.fileName,
      blobUrl: r.resubmission.blobUrl,
      mimeType: r.resubmission.mimeType,
      size: r.resubmission.size,
    }),
  )
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
          defenseSchedules: { where: { deletedAt: null }, select: { id: true } },
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

  const existing = await prisma.defenseSchedule.findFirst({
    where: { groupId, deletedAt: null },
    select: { id: true },
  })
  if (existing) {
    return {
      success: false,
      message: 'This group already has a defense schedule.',
    }
  }

  const type = formData.get('type')?.toString() ?? ''
  if (!DEFENSE_TYPES.includes(type as DefenseType)) {
    return { success: false, message: 'Invalid defense type.' }
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
      select: { id: true, createdBy: true },
    })
    if (!schedule) {
      return { success: false, message: 'Defense schedule not found.' }
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
        include: { panelists: true },
      })
    })

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
      select: { id: true, createdBy: true },
    })
    if (!schedule) {
      return { success: false, message: 'Defense schedule not found.' }
    }
    if (schedule.createdBy !== +session.user.id) {
      return unauthorized
    }

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

    revalidateTag('defense', 'max')
    revalidateFeature('defense')

    return { success: true, message: 'Defense schedule deleted.' }
  } catch (error) {
    console.error('[deleteDefenseSchedule | Error]:', error)
    return { success: false, message: 'Failed to delete defense schedule.' }
  }
}

// ───────────────────────────── Defense session workspace ─────────────────────

export interface DefenseSessionResubmissionPayload {
  id: number
  /** Version ordinal — 1 is the initial document, 2+ are resubmissions. */
  version: number
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
  /** When this version was submitted. */
  dateSubmitted: string
  /** Per-panelist review state for this version. */
  reviews: {
    panelistId: number
    name: string
    status: DefenseResubmissionStatus
  }[]
}

export interface DefenseSessionPayload extends MyDefenseSchedulePayload {
  /** The current user's role on this schedule's panel (CHAIR / PANEL_MEMBER). */
  myRole: PanelistRole
  /** Submission history — initial document first, then resubmissions. */
  resubmissions: DefenseSessionResubmissionPayload[]
}

// A single defense session for the workspace page. Returns the schedule with
// its group, section, panel, and full submission history (initial document +
// every resubmission with per-panelist review state). Reuses the 'defense'
// cache tag so any schedule/resubmission mutation busts this read too.
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
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { role: 'asc' },
      },
      createdByUser: { select: { id: true, name: true } },
      resubmissions: {
        where: { deletedAt: null },
        include: {
          reviews: {
            where: { deletedAt: null },
            include: { panelist: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
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
    createdById: schedule.createdBy,
    createdByName: schedule.createdByUser.name,
    panelists: schedule.panelists.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      image: p.user.image,
      role: p.role,
    })),
    myRole:
      schedule.panelists.find((p) => p.userId === userId)?.role ?? 'PANEL_MEMBER',
    resubmissions: schedule.resubmissions.map((r, index) => ({
      id: r.id,
      // The initial document is version 1; each resubmission increments it.
      version: index + 2,
      fileName: r.fileName,
      blobUrl: r.blobUrl,
      mimeType: r.mimeType,
      size: r.size,
      dateSubmitted: r.createdAt.toISOString(),
      reviews: r.reviews.map((review) => ({
        panelistId: review.panelistId,
        name: review.panelist.name,
        status: review.status,
      })),
    })),
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
