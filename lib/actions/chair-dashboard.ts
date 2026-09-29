'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag } from 'next/cache'
import { ADVISER_CAP } from '@/config/constants'
import { requireAdminOrProgramChair, unauthorized } from '@/lib/actions/guard'

/**
 * Program Chair dashboard — read-only aggregates.
 *
 * Every figure here is derived; no table needs a new column and nothing is
 * written. Each action is guarded by `requireAdminOrProgramChair`, which
 * re-checks the chair flag against the DB rather than trusting the JWT, so
 * removing the role takes effect without waiting for a session refresh.
 *
 * Cached under a single `chair-dashboard` tag with a short life. Section,
 * defence and assignment mutations should call `revalidateTag('chair-dashboard')`
 * to keep the numbers honest; until they do, treat this as a fast-moving read
 * that may lag by minutes.
 *
 * Convention: return `{ success, message, payload }` and never throw, so one
 * failed query renders a single card in an error state instead of blanking the
 * dashboard.
 */

const CACHE_TAG = 'chair-dashboard'

// Figma showed a cap of 5; ADVISER_CAP is 8. Buckets below follow the constant,
// not the mock, so the bars agree with the advisers table.
const LOADED_FLOOR = 2

export type SectionOverview = {
  total: number
  assigned: number
  unassigned: number
}

export type FacultyCapacity = {
  totalAdvisers: number
  available: number
  loaded: number
  fullLoad: number
  cap: number
}

export type SectionPhaseSpread = {
  capstone1: number
  capstone2: number
  total: number
}

export type DefenseOutcomeCounts = {
  approved: number
  minorRevision: number
  majorRevision: number
  redefense: number
  total: number
}

export type UpcomingDefense = {
  id: number
  label: string
  sectionName: string | null
  date: Date
  startTime: string | null
}

export type DefenseOverview = {
  forDefense: number
  completed: number
  outcomes: DefenseOutcomeCounts
  upcoming: UpcomingDefense[]
  upcomingTotal: number
}

export type CalendarDeadline = {
  id: string
  date: Date
  label: string
  kind: 'DEFENSE' | 'EVENT'
}

/* ── Section overview ─────────────────────────────────────────────────────── */

async function getSectionOverviewData(): Promise<SectionOverview> {
  'use cache'
  cacheTag(CACHE_TAG)
  cacheLife('hours')

  const [total, assigned] = await prisma.$transaction([
    prisma.section.count({ where: { deletedAt: null } }),
    prisma.section.count({ where: { deletedAt: null, coordinatorId: { not: null } } }),
  ])

  return { total, assigned, unassigned: total - assigned }
}

export async function getSectionOverview(): Promise<{
  success: boolean
  payload: SectionOverview | null
  message?: string
}> {
  if (!(await requireAdminOrProgramChair())) {
    return { ...unauthorized, payload: null }
  }
  try {
    return { success: true, payload: await getSectionOverviewData() }
  } catch {
    return { success: false, payload: null, message: 'Failed to load section overview' }
  }
}

/* ── Faculty capacity ─────────────────────────────────────────────────────── */

async function getFacultyCapacityData(): Promise<FacultyCapacity> {
  'use cache'
  cacheTag(CACHE_TAG)
  cacheLife('hours')

  // Workload is the count of live groups an adviser currently holds. Matches
  // FacultyList exactly: the count is filtered on the live Adviser row, and
  // Capstone.adviserId is a denormalized snapshot that must never be summed on
  // top of this.
  const advisers = await prisma.adviser.findMany({
    where: { deletedAt: null },
    select: { _count: { select: { groups: { where: { deletedAt: null } } } } },
  })

  let available = 0
  let loaded = 0
  let fullLoad = 0

  for (const adviser of advisers) {
    const held = adviser._count.groups
    if (held >= ADVISER_CAP) fullLoad++
    else if (held >= LOADED_FLOOR) loaded++
    else available++
  }

  return { totalAdvisers: advisers.length, available, loaded, fullLoad, cap: ADVISER_CAP }
}

export async function getFacultyCapacity(): Promise<{
  success: boolean
  payload: FacultyCapacity | null
  message?: string
}> {
  if (!(await requireAdminOrProgramChair())) {
    return { ...unauthorized, payload: null }
  }
  try {
    return { success: true, payload: await getFacultyCapacityData() }
  } catch {
    return { success: false, payload: null, message: 'Failed to load faculty capacity' }
  }
}

/* ── Section phase spread ─────────────────────────────────────────────────── */

async function getSectionPhaseSpreadData(): Promise<SectionPhaseSpread> {
  'use cache'
  cacheTag(CACHE_TAG)
  cacheLife('hours')

  // A section counts as Capstone 2 once its capstone2OpenedAt is set. Anything
  // else — including a section that has not started — is Capstone 1, because
  // the gate is closed rather than absent. No third bucket.
  const sections = await prisma.section.findMany({
    where: { deletedAt: null },
    select: { capstone2OpenedAt: true },
  })

  const capstone2 = sections.filter((s) => s.capstone2OpenedAt !== null).length
  const total = sections.length

  return { capstone1: total - capstone2, capstone2, total }
}

export async function getSectionPhaseSpread(): Promise<{
  success: boolean
  payload: SectionPhaseSpread | null
  message?: string
}> {
  if (!(await requireAdminOrProgramChair())) {
    return { ...unauthorized, payload: null }
  }
  try {
    return { success: true, payload: await getSectionPhaseSpreadData() }
  } catch {
    return { success: false, payload: null, message: 'Failed to load section phase spread' }
  }
}

/* ── Defence overview ─────────────────────────────────────────────────────── */

function defenseLabel(type: string): string {
  return type === 'FINAL' ? 'Final Defense' : 'Proposal Defense'
}

async function getDefenseOverviewData(): Promise<DefenseOverview> {
  'use cache'
  cacheTag(CACHE_TAG)
  cacheLife('hours')

  const UPCOMING_LIMIT = 3

  const [forDefense, completed, approved, minorRevision, majorRevision, redefense, upcoming] =
    await prisma.$transaction([
      prisma.defenseSchedule.count({ where: { deletedAt: null, verdict: 'PENDING' } }),
      prisma.defenseSchedule.count({ where: { deletedAt: null, verdict: { not: 'PENDING' } } }),
      prisma.defenseSchedule.count({ where: { deletedAt: null, verdict: 'APPROVED' } }),
      prisma.defenseSchedule.count({ where: { deletedAt: null, verdict: 'MINOR_REVISION' } }),
      prisma.defenseSchedule.count({ where: { deletedAt: null, verdict: 'MAJOR_REVISION' } }),
      prisma.defenseSchedule.count({ where: { deletedAt: null, verdict: 'REDEFENSE' } }),
      prisma.defenseSchedule.findMany({
        where: { deletedAt: null, date: { gte: new Date() } },
        orderBy: { date: 'asc' },
        take: UPCOMING_LIMIT,
        select: {
          id: true,
          type: true,
          date: true,
          startTime: true,
          group: { select: { groupName: true, section: { select: { section: true } } } },
        },
      }),
    ])

  const upcomingTotal = await prisma.defenseSchedule.count({
    where: { deletedAt: null, date: { gte: new Date() } },
  })

  return {
    forDefense,
    completed,
    outcomes: {
      approved,
      minorRevision,
      majorRevision,
      redefense,
      total: approved + minorRevision + majorRevision + redefense,
    },
    upcoming: upcoming.map((d) => ({
      id: d.id,
      label: defenseLabel(d.type),
      sectionName: d.group.section?.section ?? null,
      date: d.date,
      startTime: d.startTime ?? null,
    })),
    upcomingTotal,
  }
}

export async function getDefenseOverview(): Promise<{
  success: boolean
  payload: DefenseOverview | null
  message?: string
}> {
  if (!(await requireAdminOrProgramChair())) {
    return { ...unauthorized, payload: null }
  }
  try {
    return { success: true, payload: await getDefenseOverviewData() }
  } catch {
    return { success: false, payload: null, message: 'Failed to load defense overview' }
  }
}

/* ── Calendar deadlines ───────────────────────────────────────────────────── */

async function getCalendarDeadlinesData(): Promise<CalendarDeadline[]> {
  'use cache'
  cacheTag(CACHE_TAG)
  cacheLife('hours')

  // Two sources only, per the spec: scheduled defences and program calendar
  // events. Chapter deadlines are deliberately excluded — Milestone holds no due
  // date and MilestoneAvailability records *open* dates, so neither can back a
  // real deadline row.
  const [defenses, events] = await prisma.$transaction([
    prisma.defenseSchedule.findMany({
      where: { deletedAt: null },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        type: true,
        date: true,
        group: { select: { groupName: true, section: { select: { section: true } } } },
      },
    }),
    prisma.calendarEvent.findMany({
      where: { deletedAt: null },
      orderBy: { startsAt: 'asc' },
      select: { id: true, title: true, startsAt: true },
    }),
  ])

  const merged: CalendarDeadline[] = [
    ...defenses.map((d) => ({
      id: `defense-${d.id}`,
      date: d.date,
      label: `${defenseLabel(d.type)} · ${d.group.section?.section ?? d.group.groupName}`,
      kind: 'DEFENSE' as const,
    })),
    ...events.map((e) => ({
      id: `event-${e.id}`,
      date: e.startsAt,
      label: e.title,
      kind: 'EVENT' as const,
    })),
  ]

  return merged.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export async function getCalendarDeadlines(): Promise<{
  success: boolean
  payload: CalendarDeadline[] | null
  message?: string
}> {
  if (!(await requireAdminOrProgramChair())) {
    return { ...unauthorized, payload: null }
  }
  try {
    return { success: true, payload: await getCalendarDeadlinesData() }
  } catch {
    return { success: false, payload: null, message: 'Failed to load calendar deadlines' }
  }
}
