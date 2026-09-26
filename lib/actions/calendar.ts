'use server'

import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { cacheTag, cacheLife } from 'next/cache'
import { connection } from 'next/server'
import { requireAdminOrProgramChair } from '@/lib/actions/guard'
import { audit } from '@/lib/actions/audit'
import { revalidateCalendarCache } from '@/lib/actions/revalidate'
import {
  SECTION_HEADER_PALETTE,
  headerStyleFor,
  isSectionHeaderColorKey,
  type SectionHeaderColorKey,
} from '@/lib/sectionHeader'

// ───────────────────────── Event feed reader (subtask 03) ─────────────────────────
// Role-scoped feed of DefenseSchedule + manual CalendarEvent rows into one
// FullCalendar-ready feed.
//
// Caching: the two internal readers below are persistent ('use cache' +
// cacheTag('calendar')), mirroring lib/actions/repository.ts. They take NO
// session/args so every role shares one cache entry per source; role scoping
// happens afterwards in getCalendarFeed (uncached — it reads the session),
// so unauthorized callers never receive cross-scope rows.
// Mutations (subtask 04) MUST call revalidateCalendar() after every write.
//
// Single-day vs span convention: end === start means a single day. Manual
// rows with endsAt > startsAt are multi-day spans, passed through as-is.
//
// Manual scope is audience-based (STUDENT | FACULTY | ALL) — never
// section-based. The feed object still carries groupId/sectionId as null on
// manual events so the client contract stays stable alongside defense rows
// (which keep their real group/section data).

// FullCalendar event colors — docs/calendar-page-layout.md.
// Module-private: 'use server' files cannot export values, and clients don't
// need the map (every feed event already carries its resolved color).
//
// Defense types map onto SECTION_HEADER_PALETTE presets rather than bespoke
// hexes, so a defense chip is the same construct as a manual one: Proposal
// takes the palette default (Purple) and Final takes Rose. The client decides
// the treatment per view — see renderEventContent.
const DEFENSE_PALETTE_KEY = {
  proposal: 'default',
  final: '0',
} as const satisfies Record<string, SectionHeaderColorKey>

function defensePresetFor(type: string) {
  const key = type === 'FINAL' ? DEFENSE_PALETTE_KEY.final : DEFENSE_PALETTE_KEY.proposal
  return { key, preset: headerStyleFor(key) }
}

// Manual-event color comes from the section-card palette
// (SECTION_HEADER_PALETTE in lib/sectionHeader.ts) — the same six presets the
// section cards use, so the calendar and the sections read as one system.
// Each preset supplies a light `bg` for the pill and a dark `text` for the
// label; that pairing is the whole reason the palette has five tones per entry.
//
// The ramp deliberately does NOT reuse the defense colors: #fe6f6f already
// means "Final Defense" and #707dff means "Proposal Defense", so neither is
// available as a manual-event color without creating an ambiguous overlap.
//
// The palette default (Purple, entry 0) is the fallback for a null or unknown
// key, so a malformed row still renders a sane pill.
const MANUAL_EVENT_FALLBACK_COLOR = SECTION_HEADER_PALETTE[0]

export type CalendarFeedKind =
  | 'defense'
  | 'milestone-opened'
  | 'milestone-submission'
  | 'archive'
  | 'manual'

// FullCalendar-ready event. All dates are ISO strings (plain JSON across the
// 'use cache' / server-client boundary — never Date objects).
export interface CalendarFeedEvent {
  id: string
  kind: CalendarFeedKind
  title: string
  start: string
  end: string
  allDay: boolean
  color: string
  href: string
  groupId: number | null
  sectionId: number | null
  groupName: string | null
  sectionName: string | null
  audience: string | null
  /** Manual events: the chosen palette key (null = default). Defenses: the
   *  preset their type maps to. */
  colorKey: string | null
  /** Saturated marker tone for a fill-less row. Set for defenses only — a
   *  filled chip needs no marker, and the palette's pastel `bg` is far too
   *  light to read as a small dot on the grid. */
  markerColor: string | null
  /** Label color for the pill. Dark for every variant, but supplied per-event
   *  because the palette supplies a different dark tone per preset. */
  textColor: string
  description: string | null
  status: string | null
}

// ───────────────────────── cached source readers ─────────────────────────
// Each mirrors getArchivedCapstonesData: 'use cache' + tags, try/catch that
// persists null so a missing-table DB error degrades to empty UI instead of
// failing the prerender. All rows converted to ISO strings here.

interface DefenseFeedRow {
  id: number
  groupId: number
  groupName: string
  sectionId: number
  sectionName: string
  groupDeletedAt: string | null
  type: 'PROPOSAL' | 'FINAL'
  date: string
  startTime: string
  endTime: string
  venue: string
  verdict: string
}

async function getCalendarDefensesData(): Promise<DefenseFeedRow[] | null> {
  'use cache'
  cacheTag('calendar')
  cacheLife('max')

  try {
    const rows = await prisma.defenseSchedule.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        groupId: true,
        type: true,
        date: true,
        startTime: true,
        endTime: true,
        venue: true,
        verdict: true,
        group: {
          select: {
            groupName: true,
            sectionId: true,
            deletedAt: true,
            section: { select: { section: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    })
    return rows.map((r) => ({
      id: r.id,
      groupId: r.groupId,
      groupName: r.group.groupName,
      sectionId: r.group.sectionId,
      sectionName: r.group.section.section,
      groupDeletedAt: r.group.deletedAt ? r.group.deletedAt.toISOString() : null,
      type: r.type,
      date: r.date.toISOString(),
      startTime: r.startTime,
      endTime: r.endTime,
      venue: r.venue,
      verdict: r.verdict,
    }))
  } catch (error) {
    console.error('[getCalendarDefensesData | Error]:', error)
    return null
  }
}

interface ManualFeedRow {
  id: number
  title: string
  description: string | null
  startsAt: string
  endsAt: string
  allDay: boolean
  audience: 'STUDENT' | 'FACULTY' | 'ALL'
  colorKey: SectionHeaderColorKey | null
}

async function getCalendarManualEventsData(): Promise<ManualFeedRow[] | null> {
  'use cache'
  cacheTag('calendar')
  cacheLife('max')

  try {
    const rows = await prisma.calendarEvent.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        allDay: true,
        audience: true,
        colorKey: true,
      },
      orderBy: { startsAt: 'asc' },
    })
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      allDay: r.allDay,
      audience: r.audience,
      colorKey: isSectionHeaderColorKey(r.colorKey) ? r.colorKey : null,
    }))
  } catch (error) {
    console.error('[getCalendarManualEventsData | Error]:', error)
    return null
  }
}

// ───────────────────────── scope resolution (uncached) ─────────────────────────

interface CalendarScope {
  userId: number
  isPrivileged: boolean
  isStaff: boolean
  groupIds: number[]
}

// Resolves the caller's server-side scope. Privileged = SUPERADMIN/ADMIN or
// program chair (DB-checked, mirrors requireAdminOrProgramChair). Students
// contribute their own group + section; advisers their advised groups (+
// their sections); coordinators their sections (+ groups inside them).
// Returns null for unauthenticated, guest, soft-deleted, or scope-less users
// with no program-wide visibility — callers then get no cross-scope data.
async function resolveCalendarScope(): Promise<CalendarScope | null> {
  // Establish request context first: during prerender there are no cookies,
  // so the session read below (next-auth mints a sync CSRF token via
  // randomBytes before any fetch) would trip the prerender randomness guard.
  await connection()
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const role = (session.user.role as string) ?? ''
  if (role === 'GUEST') return null
  const userId = +session.user.id
  if (!Number.isFinite(userId)) return null

  if (role === 'SUPERADMIN' || role === 'ADMIN') {
    return {
      userId,
      isPrivileged: true,
      isStaff: true,
      groupIds: [],
    }
  }

  const [liveUser, student, faculty] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } }),
    prisma.student.findFirst({
      where: { userId, deletedAt: null },
      select: { groupId: true, sectionId: true },
    }),
    prisma.faculty.findFirst({
      where: { userId, deletedAt: null },
      select: {
        isProgramChair: true,
        adviser: {
          select: {
            id: true,
            groups: {
              where: { deletedAt: null },
              select: { id: true, sectionId: true },
            },
          },
        },
        coordinator: {
          select: {
            id: true,
            // Relation is singular on Coordinator (`section Section[]`).
            section: {
              where: { deletedAt: null },
              select: {
                id: true,
                groups: { where: { deletedAt: null }, select: { id: true } },
              },
            },
          },
        },
      },
    }),
  ])

  // Soft-deleted users keep no calendar visibility (mandatory soft-delete).
  if (!liveUser) return null

  if (faculty?.isProgramChair) {
    return {
      userId,
      isPrivileged: true,
      isStaff: true,
      groupIds: [],
    }
  }

  const groupIds = new Set<number>()

  if (student?.groupId != null) groupIds.add(student.groupId)

  const adviser = faculty?.adviser
  if (adviser) {
    for (const g of adviser.groups ?? []) {
      groupIds.add(g.id)
    }
  }

  const coordinator = faculty?.coordinator
  if (coordinator) {
    for (const s of coordinator.section ?? []) {
      for (const g of s.groups ?? []) groupIds.add(g.id)
    }
  }

  return {
    userId,
    isPrivileged: false,
    isStaff: !!faculty,
    groupIds: [...groupIds],
  }
}

// ───────────────────────── mapping helpers ─────────────────────────

// Calendar events are authored and displayed in Manila wall-clock time
// (CalendarClient sets timeZone="Asia/Manila"; the scheduling wizard uses a
// bare <input type="time">). Asia/Manila is a fixed UTC+8 with no DST, so a
// literal offset is exact. It must be applied explicitly: building a
// server-local Date made every defense shift by 8 hours wherever the server
// was not itself on UTC+8 (Vercel runs UTC, so a 9:00 AM defense rendered at
// 5:00 PM and evening defenses fell into the wrong day cell).
const MANILA_UTC_OFFSET = '+08:00'

// Combines a DefenseSchedule date (midnight) with an "HH:mm" time string
// (<input type="time"> in the scheduling wizard), interpreting both as Manila
// wall-clock time. Returns null when the time is missing/malformed so callers
// fall back to the date-only day event.
function combineDefenseDateTime(dateISO: string, time: string): string | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec((time ?? '').trim())
  if (!match) return null
  const day = dateISO.slice(0, 10)
  const seconds = match[3] ?? '00'
  const combined = new Date(
    `${day}T${match[1]}:${match[2]}:${seconds}${MANILA_UTC_OFFSET}`,
  )
  if (Number.isNaN(combined.getTime())) return null
  return combined.toISOString()
}

// ───────────────────────── public reader ─────────────────────────

/**
 * Role-scoped calendar feed — DefenseSchedule + manual CalendarEvent rows
 * into FullCalendar-ready events, oldest first.
 * Server-side scoping only (never rely on hidden UI): students see their own
 * group/section, advisers their advised groups, coordinators their sections,
 * chair/admin everything. Manual events are audience-scoped (STUDENT =
 * students only, FACULTY = staff only, ALL = every scoped caller). Guests
 * are excluded via resolveCalendarScope. Never throws.
 */
export async function getCalendarFeed(): Promise<{
  success: boolean
  message: string
  payload: CalendarFeedEvent[] | null
}> {
  try {
    const scope = await resolveCalendarScope()
    if (!scope) {
      return {
        success: false,
        message: 'You are not authorized to view the calendar.',
        payload: null,
      }
    }

    // Independent cached sources — one Promise.all, no waterfall.
    const [defenses, manual] = await Promise.all([
      getCalendarDefensesData(),
      getCalendarManualEventsData(),
    ])

    if (!defenses || !manual) {
      return { success: false, message: 'Failed to load calendar events.', payload: null }
    }

    const inGroupScope = (groupId: number | null): boolean => {
      if (scope.isPrivileged) return true
      if (groupId == null) return true
      return scope.groupIds.includes(groupId)
    }
    // Manual visibility is audience-based: privileged callers see everything;
    // ALL is visible to every scoped caller; STUDENT only to non-staff
    // (students); FACULTY only to staff (faculty/admin/chair/coordinators).
    const isManualVisible = (audience: ManualFeedRow['audience']): boolean => {
      if (scope.isPrivileged) return true
      if (audience === 'ALL') return true
      if (audience === 'STUDENT') return !scope.isStaff
      return scope.isStaff
    }

    const events: CalendarFeedEvent[] = []

    for (const d of defenses) {
      if (d.groupDeletedAt) continue
      if (!inGroupScope(d.groupId)) continue
      const isFinal = d.type === 'FINAL'
      const { key: defenseColorKey, preset } = defensePresetFor(d.type)
      const start = combineDefenseDateTime(d.date, d.startTime) ?? d.date
      const end = combineDefenseDateTime(d.date, d.endTime) ?? d.date
      events.push({
        id: `defense-${d.id}`,
        kind: 'defense',
        title: `${isFinal ? 'Final' : 'Proposal'} Defense — ${d.groupName}`,
        start,
        end,
        allDay: start === end,
        // Palette fill + label tone, identical in shape to a manual event.
        color: preset.bg,
        textColor: preset.text,
        href: scope.isStaff
          ? `/faculty/defense/${d.id}`
          : `/student/milestone/${isFinal ? 'final-defense' : 'proposal-defense'}`,
        groupId: d.groupId,
        sectionId: d.sectionId,
        groupName: d.groupName,
        sectionName: d.sectionName,
        audience: null,
        colorKey: defenseColorKey,
        // Saturated dot tone: the pastel g is invisible at marker size.
        markerColor: preset.dot,
        description: d.venue ? `Venue: ${d.venue}` : null,
        status: d.verdict,
      })
    }

    for (const m of manual) {
      if (!isManualVisible(m.audience)) continue
      // Unknown or null key resolves to the palette default, so a malformed
      // row still renders a sane pill instead of an uncolored one.
      const preset = m.colorKey ? headerStyleFor(m.colorKey) : MANUAL_EVENT_FALLBACK_COLOR
      events.push({
        id: `manual-${m.id}`,
        kind: 'manual',
        title: m.title,
        start: m.startsAt,
        end: m.endsAt,
        allDay: m.allDay,
        // The palette preset supplies both tones: light fill, dark label.
        color: preset.bg,
        textColor: preset.text,
        href: '/calendar',
        groupId: null,
        sectionId: null,
        groupName: null,
        sectionName: null,
        audience: m.audience,
        colorKey: m.colorKey,
        // A filled chip needs no marker.
        markerColor: null,
        description: m.description,
        status: null,
      })
    }

    events.sort((x, y) => (x.start < y.start ? -1 : x.start > y.start ? 1 : 0))

    return { success: true, message: '', payload: events }
  } catch (error) {
    // Prerenders carry no request context, so the session read above rejects
    // by design (HANGING_PROMISE_REJECTION) — the empty shell streams real
    // data per request instead. Stay quiet here; log only real failures.
    const digest = (error as { digest?: unknown })?.digest
    const message = error instanceof Error ? error.message : String(error)
    if (digest === 'HANGING_PROMISE_REJECTION' || message.includes('During prerendering')) {
      return { success: false, message: '', payload: null }
    }
    console.error('[getCalendarFeed | Error]:', error)
    return { success: false, message: 'Failed to load calendar events.', payload: null }
  }
}

// ───────────────────────── invalidation (subtask 04) ─────────────────────────

/**
 * Busts the calendar feed cache + the /calendar path. Subtask-04 mutations
 * (create/update/delete CalendarEvent) MUST call this after every write.
 *
 * Defense writes are covered without calling this directly:
 * revalidateFeature('defense') delegates to the same helper, so every
 * schedule/reschedule/verdict mutation already invalidates the feed.
 */
export async function revalidateCalendar(): Promise<void> {
  revalidateCalendarCache()
}

// ───────────────────────── mutations (subtask 04) ─────────────────────────
// Chair/admin-only CalendarEvent writes. Guarded server-side via
// requireAdminOrProgramChair (DB-backed program-chair check from
// lib/actions/guard.ts) — never rely on hidden UI. Every successful write
// awaits the existing revalidateCalendar() above so the 'calendar' tag +
// /calendar path stay fresh. All responses are plain
// { success, message, payload? }; nothing throws. createdById always comes
// from the session; updates never change the creator; deletes soft-delete.

const CALENDAR_TITLE_MAX = 200
const CALENDAR_DESCRIPTION_MAX = 2000

export interface CalendarEventInput {
  title?: string | null
  description?: string | null
  startsAt?: string | Date | null
  endsAt?: string | Date | null
  allDay?: boolean | string | null
  audience?: string | null
  colorKey?: string | null
}

export interface CalendarEventPayload {
  id: number
  title: string
  description: string | null
  startsAt: string
  endsAt: string
  allDay: boolean
  audience: 'STUDENT' | 'FACULTY' | 'ALL'
  colorKey: SectionHeaderColorKey | null
}

function isCalendarAudience(value: unknown): value is 'STUDENT' | 'FACULTY' | 'ALL' {
  return value === 'STUDENT' || value === 'FACULTY' || value === 'ALL'
}

// Human-readable list for the validation message, so adding a palette preset
// automatically updates the copy.
const COLOR_KEY_ERROR = `Color must be one of: ${SECTION_HEADER_PALETTE.map(
  (preset) => preset.label,
).join(', ')}.`

// Reads one field from either a FormData (useActionState) or a plain object.
// `present` distinguishes omitted (update keeps existing) from explicit empty
// (clears an optional field / fails a required one).
function getCalendarField(
  input: FormData | Record<string, unknown>,
  key: string,
): { present: boolean; value: unknown } {
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    if (!input.has(key)) return { present: false, value: undefined }
    return { present: true, value: input.get(key) }
  }
  const record = input as Record<string, unknown>
  if (record != null && Object.prototype.hasOwnProperty.call(record, key)) {
    return { present: true, value: record[key] }
  }
  return { present: false, value: undefined }
}

// Parses a required-or-optional date value. Returns null for missing/invalid
// (callers map null to "required" or "invalid date" errors).
function parseCalendarDate(value: unknown): Date | null {
  if (value === undefined || value === null) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const text = String(value).trim()
  if (text === '') return null
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// Parses the all-day flag from a boolean or common string forms (FormData
// checkboxes arrive as 'on'). Returns null when omitted/blank/unrecognized
// so callers fall back to their default (create: true, update: existing).
function parseCalendarAllDay(value: unknown): boolean | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value
  const text = String(value).trim().toLowerCase()
  if (text === '') return null
  if (text === 'true' || text === '1' || text === 'on' || text === 'yes') return true
  if (text === 'false' || text === '0' || text === 'off' || text === 'no') return false
  return null
}

function mapCalendarRow(row: {
  id: number
  title: string
  description: string | null
  startsAt: Date
  endsAt: Date
  audience: 'STUDENT' | 'FACULTY' | 'ALL'
  // Loose on the way in: Prisma types the column as a plain string. Narrowed
  // here so an unexpected value degrades to the palette default instead of
  // reaching the client as an unknown key.
  colorKey?: string | null
} & { allDay?: boolean }): CalendarEventPayload {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    allDay: row.allDay ?? true,
    audience: row.audience,
    colorKey: isSectionHeaderColorKey(row.colorKey) ? row.colorKey : null,
  }
}

/**
 * Chair/admin-only: creates a manual CalendarEvent. Accepts FormData
 * (useActionState) or a plain object. Title required (<=200 chars);
 * description optional (<=2000 chars); startsAt/endsAt must parse and satisfy
 * endsAt >= startsAt; allDay optional boolean (defaults true); audience
 * STUDENT|FACULTY|ALL (defaults ALL). createdById always comes from
 * the session. Never throws.
 */
export async function createCalendarEvent(
  _prevState: any,
  input: FormData | CalendarEventInput,
): Promise<{ success: boolean; message: string; payload: CalendarEventPayload | null }> {
  try {
    const session = await requireAdminOrProgramChair()
    if (!session?.user?.id) {
      return {
        success: false,
        message: 'You are not authorized to perform this action.',
        payload: null,
      }
    }
    // Direct single-arg calls pass the payload as _prevState; useActionState
    // calls pass (prev, formData/object). Prefer the second arg when present.
    const raw = (input ?? _prevState) as FormData | CalendarEventInput
    if (!raw || typeof raw !== 'object') {
      return { success: false, message: 'Invalid event data.', payload: null }
    }

    const titleField = getCalendarField(raw as Record<string, unknown>, 'title')
    const title = titleField.present ? String(titleField.value ?? '').trim() : ''
    if (!title) {
      return { success: false, message: 'Title is required.', payload: null }
    }
    if (title.length > CALENDAR_TITLE_MAX) {
      return {
        success: false,
        message: `Title must be at most ${CALENDAR_TITLE_MAX} characters.`,
        payload: null,
      }
    }

    const descriptionField = getCalendarField(raw as Record<string, unknown>, 'description')
    let description: string | null = null
    if (descriptionField.present) {
      const rawDescription =
        descriptionField.value === null || descriptionField.value === undefined
          ? ''
          : String(descriptionField.value).trim()
      if (rawDescription !== '') {
        if (rawDescription.length > CALENDAR_DESCRIPTION_MAX) {
          return {
            success: false,
            message: `Description must be at most ${CALENDAR_DESCRIPTION_MAX} characters.`,
            payload: null,
          }
        }
        description = rawDescription
      }
    }

    const startsField = getCalendarField(raw as Record<string, unknown>, 'startsAt')
    const endsField = getCalendarField(raw as Record<string, unknown>, 'endsAt')
    const startsAt = parseCalendarDate(startsField.present ? startsField.value : undefined)
    const endsAt = parseCalendarDate(endsField.present ? endsField.value : undefined)
    if (!startsAt || !endsAt) {
      return {
        success: false,
        message: 'Valid start and end dates are required.',
        payload: null,
      }
    }
    if (endsAt.getTime() < startsAt.getTime()) {
      return {
        success: false,
        message: 'End date must be on or after the start date.',
        payload: null,
      }
    }

    // Omitted/unrecognized allDay defaults to true (matches the column
    // default, so explicit and implicit creates display the same).
    const allDayField = getCalendarField(raw as Record<string, unknown>, 'allDay')
    let allDay = true
    if (allDayField.present) {
      const parsedAllDay = parseCalendarAllDay(allDayField.value)
      if (parsedAllDay != null) allDay = parsedAllDay
    }

    const audienceField = getCalendarField(raw as Record<string, unknown>, 'audience')
    let audience: 'STUDENT' | 'FACULTY' | 'ALL' = 'ALL'
    if (audienceField.present) {
      const rawAudience =
        audienceField.value === null || audienceField.value === undefined
          ? ''
          : String(audienceField.value).trim()
      if (rawAudience !== '') {
        if (!isCalendarAudience(rawAudience)) {
          return {
            success: false,
            message: 'Audience must be STUDENT, FACULTY, or ALL.',
            payload: null,
          }
        }
        audience = rawAudience
      }
    }

    const colorKeyField = getCalendarField(raw as Record<string, unknown>, 'colorKey')
    let colorKey: SectionHeaderColorKey | null = null
    if (colorKeyField.present) {
      const rawColorKey =
        colorKeyField.value === null || colorKeyField.value === undefined
          ? ''
          : String(colorKeyField.value).trim()
      // Explicit empty means "use the palette default" rather than an error, so
      // a form that submits a blank hidden input still saves.
      if (rawColorKey !== '') {
        if (!isSectionHeaderColorKey(rawColorKey)) {
          return {
            success: false,
            message: COLOR_KEY_ERROR,
            payload: null,
          }
        }
        colorKey = rawColorKey
      }
    }

    const createdById = +session.user.id
    if (!Number.isFinite(createdById)) {
      return {
        success: false,
        message: 'You are not authorized to perform this action.',
        payload: null,
      }
    }

    const row = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        startsAt,
        endsAt,
        allDay,
        audience,
        colorKey,
        createdById,
      },
    })
    await audit({
      action: "CALENDAR_CREATE",
      entity: "CALENDAR",
      entityId: String(row.id),
      entityName: row.title,
      before: null,
      after: { title: row.title, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), audience: row.audience, colorKey: row.colorKey, allDay: row.allDay },
    })
    await revalidateCalendar()
    return { success: true, message: 'Calendar event created.', payload: mapCalendarRow(row) }
  } catch (error) {
    console.error('[createCalendarEvent | Error]:', error)
    return { success: false, message: 'Failed to create calendar event.', payload: null }
  }
}

/**
 * Chair/admin-only: partially updates a manual CalendarEvent. Omitted fields
 * keep their existing values; explicit empty description clears it; allDay
 * omitted/unrecognized keeps the existing flag; other explicit empties fail
 * their required/format checks. Same title/span/audience rules as create.
 * The creator is never changed. Never throws.
 */
export async function updateCalendarEvent(
  id: number,
  input: FormData | Partial<CalendarEventInput>,
): Promise<{ success: boolean; message: string; payload: CalendarEventPayload | null }> {
  try {
    const session = await requireAdminOrProgramChair()
    if (!session?.user?.id) {
      return {
        success: false,
        message: 'You are not authorized to perform this action.',
        payload: null,
      }
    }
    const numericId = typeof id === 'number' ? id : Number(id)
    if (!Number.isFinite(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      return { success: false, message: 'Calendar event not found.', payload: null }
    }
    if (!input || typeof input !== 'object') {
      return { success: false, message: 'Invalid event data.', payload: null }
    }

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: numericId, deletedAt: null },
    })
    if (!existing) {
      return { success: false, message: 'Calendar event not found.', payload: null }
    }

    const record = input as Record<string, unknown>
    let title = existing.title
    const titleField = getCalendarField(record, 'title')
    if (titleField.present) {
      const next = String(titleField.value ?? '').trim()
      if (!next) {
        return { success: false, message: 'Title is required.', payload: null }
      }
      if (next.length > CALENDAR_TITLE_MAX) {
        return {
          success: false,
          message: `Title must be at most ${CALENDAR_TITLE_MAX} characters.`,
          payload: null,
        }
      }
      title = next
    }

    let description: string | null = existing.description
    const descriptionField = getCalendarField(record, 'description')
    if (descriptionField.present) {
      const rawDescription =
        descriptionField.value === null || descriptionField.value === undefined
          ? ''
          : String(descriptionField.value).trim()
      if (rawDescription === '') {
        description = null
      } else {
        if (rawDescription.length > CALENDAR_DESCRIPTION_MAX) {
          return {
            success: false,
            message: `Description must be at most ${CALENDAR_DESCRIPTION_MAX} characters.`,
            payload: null,
          }
        }
        description = rawDescription
      }
    }

    let startsAt = existing.startsAt
    const startsField = getCalendarField(record, 'startsAt')
    if (startsField.present) {
      const parsed = parseCalendarDate(startsField.value)
      if (!parsed) {
        return {
          success: false,
          message: 'Valid start and end dates are required.',
          payload: null,
        }
      }
      startsAt = parsed
    }

    let endsAt = existing.endsAt
    const endsField = getCalendarField(record, 'endsAt')
    if (endsField.present) {
      const parsed = parseCalendarDate(endsField.value)
      if (!parsed) {
        return {
          success: false,
          message: 'Valid start and end dates are required.',
          payload: null,
        }
      }
      endsAt = parsed
    }
    if (endsAt.getTime() < startsAt.getTime()) {
      return {
        success: false,
        message: 'End date must be on or after the start date.',
        payload: null,
      }
    }

    // Omitted/unrecognized keeps the stored flag (pre-column rows behave as
    // true, matching the feed default).
    let allDay = (existing as unknown as { allDay: boolean }).allDay ?? true
    const allDayField = getCalendarField(record, 'allDay')
    if (allDayField.present) {
      const parsedAllDay = parseCalendarAllDay(allDayField.value)
      if (parsedAllDay != null) allDay = parsedAllDay
    }

    let audience = (existing as unknown as { audience: 'STUDENT' | 'FACULTY' | 'ALL' }).audience
    const audienceField = getCalendarField(record, 'audience')
    if (audienceField.present) {
      const rawAudience =
        audienceField.value === null || audienceField.value === undefined
          ? ''
          : String(audienceField.value).trim()
      if (rawAudience === '') {
        return {
          success: false,
          message: 'Audience must be STUDENT, FACULTY, or ALL.',
          payload: null,
        }
      }
      if (!isCalendarAudience(rawAudience)) {
        return {
          success: false,
          message: 'Audience must be STUDENT, FACULTY, or ALL.',
          payload: null,
        }
      }
      audience = rawAudience
    }

    // Omitted keeps the stored key; explicit empty resets to the palette
    // default so a chair can always clear it back to Purple.
    let colorKey = (existing as unknown as { colorKey?: string | null }).colorKey ?? null
    const colorKeyField = getCalendarField(record, 'colorKey')
    if (colorKeyField.present) {
      const rawColorKey =
        colorKeyField.value === null || colorKeyField.value === undefined
          ? ''
          : String(colorKeyField.value).trim()
      if (rawColorKey === '') {
        colorKey = null
      } else if (!isSectionHeaderColorKey(rawColorKey)) {
        return {
          success: false,
          message: COLOR_KEY_ERROR,
          payload: null,
        }
      } else {
        colorKey = rawColorKey
      }
    }

    const row = await prisma.calendarEvent.update({
      where: { id: numericId },
      data: { title, description, startsAt, endsAt, allDay, audience, colorKey },
    })
    await audit({
      action: "CALENDAR_UPDATE",
      entity: "CALENDAR",
      entityId: String(numericId),
      entityName: row.title,
      before: { title: existing.title, description: existing.description, startsAt: existing.startsAt.toISOString(), endsAt: existing.endsAt.toISOString(), audience: existing.audience, colorKey: existing.colorKey, allDay: existing.allDay },
      after: { title: row.title, description: row.description, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), audience: row.audience, colorKey: row.colorKey, allDay: row.allDay },
    })
    await revalidateCalendar()
    return { success: true, message: 'Calendar event updated.', payload: mapCalendarRow(row) }
  } catch (error) {
    console.error('[updateCalendarEvent | Error]:', error)
    return { success: false, message: 'Failed to update calendar event.', payload: null }
  }
}

/**
 * Chair/admin-only: soft-deletes a manual CalendarEvent via deletedAt.
 * Never hard-deletes. Returns not-found for missing or already-deleted rows.
 * Never throws.
 */
export async function deleteCalendarEvent(
  id: number,
): Promise<{ success: boolean; message: string; payload: { id: number } | null }> {
  try {
    const session = await requireAdminOrProgramChair()
    if (!session?.user?.id) {
      return {
        success: false,
        message: 'You are not authorized to perform this action.',
        payload: null,
      }
    }
    const numericId = typeof id === 'number' ? id : Number(id)
    if (!Number.isFinite(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      return { success: false, message: 'Calendar event not found.', payload: null }
    }

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: numericId, deletedAt: null },
      select: { id: true, title: true },
    })
    if (!existing) {
      return { success: false, message: 'Calendar event not found.', payload: null }
    }

    await prisma.calendarEvent.update({
      where: { id: numericId },
      data: { deletedAt: new Date() },
    })
    await audit({
      action: "CALENDAR_DELETE",
      entity: "CALENDAR",
      entityId: String(numericId),
      entityName: existing.title ?? `Calendar ${numericId}`,
      before: { title: existing.title, deletedAt: null },
      after: { deletedAt: new Date().toISOString() },
    })
    await revalidateCalendar()
    return {
      success: true,
      message: 'Calendar event deleted.',
      payload: { id: numericId },
    }
  } catch (error) {
    console.error('[deleteCalendarEvent | Error]:', error)
    return { success: false, message: 'Failed to delete calendar event.', payload: null }
  }
}
