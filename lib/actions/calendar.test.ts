import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { Session } from 'next-auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { requireAdminOrProgramChair } from '@/lib/actions/guard'
import { audit } from '@/lib/actions/audit'
import { revalidateCalendarCache } from '@/lib/actions/revalidate'
import {
  getCalendarFeed,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './calendar'

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findFirst: jest.fn() },
    student: { findFirst: jest.fn() },
    faculty: { findFirst: jest.fn() },
    defenseSchedule: { findMany: jest.fn() },
    calendarEvent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('next/cache', () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
  updateTag: jest.fn(),
}))

jest.mock('next/server', () => ({ connection: jest.fn() }))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/authOptions', () => ({ authOptions: {} }))
jest.mock('@/lib/actions/guard', () => ({ requireAdminOrProgramChair: jest.fn() }))
jest.mock('@/lib/actions/audit', () => ({ audit: jest.fn() }))
jest.mock('@/lib/actions/revalidate', () => ({
  revalidateFeature: jest.fn(),
  revalidateCalendarCache: jest.fn(),
}))

type AsyncMock<Result> = jest.MockedFunction<(...args: any[]) => Promise<Result>>

type PrismaMock = {
  user: { findFirst: AsyncMock<unknown> }
  student: { findFirst: AsyncMock<unknown> }
  faculty: { findFirst: AsyncMock<unknown> }
  defenseSchedule: { findMany: AsyncMock<unknown[]> }
  calendarEvent: {
    findMany: AsyncMock<unknown[]>
    findFirst: AsyncMock<unknown>
    create: AsyncMock<unknown>
    update: AsyncMock<unknown>
  }
}

const prismaMock = prisma as unknown as PrismaMock
const sessionMock = jest.mocked(getServerSession)
const guardMock = jest.mocked(requireAdminOrProgramChair)
const auditMock = jest.mocked(audit)
const revalidateCalendarMock = jest.mocked(revalidateCalendarCache)

const USER_ID = 900
const GROUP_ID = 61
const OTHER_GROUP_ID = 62
const SECTION_ID = 41

const sessionFor = (role: string, extra: Record<string, unknown> = {}): Session =>
  ({
    expires: '2099-01-01T00:00:00.000Z',
    user: { id: String(USER_ID), name: 'Test User', email: 'test@example.com', role, ...extra },
  }) as unknown as Session

const defenseRow = (overrides: Record<string, unknown> = {}) => ({
  id: 501,
  groupId: GROUP_ID,
  type: 'PROPOSAL',
  date: new Date('2026-04-15T00:00:00.000Z'),
  startTime: '09:00',
  endTime: '10:00',
  venue: 'BSIS 4A',
  verdict: 'PENDING',
  group: {
    groupName: 'Team 5',
    sectionId: SECTION_ID,
    deletedAt: null,
    section: { section: 'BSIS 4AG1' },
  },
  ...overrides,
})

const manualRow = (overrides: Record<string, unknown> = {}) => ({
  id: 701,
  title: 'Faculty Kickoff',
  description: null,
  startsAt: new Date('2026-05-01T00:00:00.000Z'),
  endsAt: new Date('2026-05-01T00:00:00.000Z'),
  allDay: true,
  audience: 'ALL',
  priority: 'NONE',
  ...overrides,
})

/** Default: a live student in GROUP_ID, no faculty record. */
function primeScope() {
  prismaMock.user.findFirst.mockResolvedValue({ id: USER_ID })
  prismaMock.student.findFirst.mockResolvedValue({ groupId: GROUP_ID, sectionId: SECTION_ID })
  prismaMock.faculty.findFirst.mockResolvedValue(null)
}

/**
 * Timezone note: this suite relies on jest.global-setup.ts pinning TZ=UTC.
 * On a Manila dev box a server-local parse of the bare "HH:mm" defense times
 * yields the same instant as the correct +08:00 parse, so the Manila
 * assertions below could not tell a correct implementation from a regressed
 * one. Under UTC they can, and they do.
 */
beforeEach(() => {
  jest.clearAllMocks()
  primeScope()
  prismaMock.defenseSchedule.findMany.mockResolvedValue([])
  prismaMock.calendarEvent.findMany.mockResolvedValue([])
  // The readers log-and-swallow on failure; keep the suite output readable.
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getCalendarFeed — access', () => {
  test('refuses an unauthenticated caller', async () => {
    sessionMock.mockResolvedValue(null)

    const res = await getCalendarFeed()

    expect(res.success).toBe(false)
    expect(res.message).toBe('You are not authorized to view the calendar.')
  })

  test('refuses a GUEST even with a valid session', async () => {
    sessionMock.mockResolvedValue(sessionFor('GUEST'))

    const res = await getCalendarFeed()

    expect(res.success).toBe(false)
    expect(res.payload).toBeNull()
  })

  test('refuses a soft-deleted user (liveUser lookup returns nothing)', async () => {
    sessionMock.mockResolvedValue(sessionFor('STUDENT'))
    prismaMock.user.findFirst.mockResolvedValue(null)

    const res = await getCalendarFeed()

    expect(res.success).toBe(false)
    expect(res.message).toBe('You are not authorized to view the calendar.')
  })

  test('reports an unauthorized scope rather than an empty calendar', async () => {
    sessionMock.mockResolvedValue(null)

    const res = await getCalendarFeed()

    expect(res.message).not.toBe('Failed to load calendar events.')
  })
})

describe('getCalendarFeed — role scoping', () => {
  test.each(['SUPERADMIN', 'ADMIN'])(
    '%s sees every defense regardless of group',
    async (role) => {
      sessionMock.mockResolvedValue(sessionFor(role))
      prismaMock.defenseSchedule.findMany.mockResolvedValue([
        defenseRow(),
        defenseRow({ id: 502, groupId: OTHER_GROUP_ID }),
      ])

      const res = await getCalendarFeed()

      expect(res.success).toBe(true)
      expect(res.payload).toHaveLength(2)
    },
  )

  test('program chair sees every defense (DB-checked flag, not the JWT)', async () => {
    sessionMock.mockResolvedValue(sessionFor('FACULTY'))
    prismaMock.faculty.findFirst.mockResolvedValue({
      isProgramChair: true,
      adviser: null,
      coordinator: null,
    })
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow(),
      defenseRow({ id: 502, groupId: OTHER_GROUP_ID }),
    ])

    const res = await getCalendarFeed()

    expect(res.success).toBe(true)
    expect(res.payload).toHaveLength(2)
  })

  test('a student sees only their own group defense', async () => {
    sessionMock.mockResolvedValue(sessionFor('STUDENT'))
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow(),
      defenseRow({ id: 502, groupId: OTHER_GROUP_ID }),
    ])

    const res = await getCalendarFeed()

    expect(res.success).toBe(true)
    expect(res.payload).toHaveLength(1)
    expect(res.payload?.[0].groupId).toBe(GROUP_ID)
  })

  test('a student deep link points at the student milestone, not the faculty route', async () => {
    sessionMock.mockResolvedValue(sessionFor('STUDENT'))
    prismaMock.defenseSchedule.findMany.mockResolvedValue([defenseRow()])

    const res = await getCalendarFeed()

    expect(res.payload?.[0].href).toBe('/student/milestone/proposal-defense')
  })

  test('an adviser sees their advised groups and gets the faculty deep link', async () => {
    sessionMock.mockResolvedValue(sessionFor('FACULTY'))
    prismaMock.student.findFirst.mockResolvedValue(null)
    prismaMock.faculty.findFirst.mockResolvedValue({
      isProgramChair: false,
      adviser: { id: 5, groups: [{ id: OTHER_GROUP_ID, sectionId: SECTION_ID }] },
      coordinator: null,
    })
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow({ id: 501, groupId: OTHER_GROUP_ID }),
      defenseRow({ id: 503, groupId: 999 }),
    ])

    const res = await getCalendarFeed()

    expect(res.payload).toHaveLength(1)
    expect(res.payload?.[0].groupId).toBe(OTHER_GROUP_ID)
    expect(res.payload?.[0].href).toBe('/faculty/defense/501')
  })

  test('a coordinator sees the groups inside their own sections', async () => {
    sessionMock.mockResolvedValue(sessionFor('FACULTY'))
    prismaMock.student.findFirst.mockResolvedValue(null)
    prismaMock.faculty.findFirst.mockResolvedValue({
      isProgramChair: false,
      adviser: null,
      coordinator: {
        id: 44,
        section: [{ id: SECTION_ID, groups: [{ id: OTHER_GROUP_ID }] }],
      },
    })
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow({ id: 501, groupId: OTHER_GROUP_ID }),
      defenseRow({ id: 504, groupId: 999 }),
    ])

    const res = await getCalendarFeed()

    expect(res.payload).toHaveLength(1)
    expect(res.payload?.[0].groupId).toBe(OTHER_GROUP_ID)
  })

  test('a defense whose group is soft-deleted is never surfaced', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow({
        group: {
          groupName: 'Team 5',
          sectionId: SECTION_ID,
          deletedAt: new Date('2026-01-01T00:00:00.000Z'),
          section: { section: 'BSIS 4AG1' },
        },
      }),
    ])

    const res = await getCalendarFeed()

    expect(res.payload).toEqual([])
  })
})

describe('getCalendarFeed — manual event audience', () => {
  const audiences = ['ALL', 'STUDENT', 'FACULTY'] as const

  test('a student sees ALL and STUDENT, never FACULTY', async () => {
    sessionMock.mockResolvedValue(sessionFor('STUDENT'))
    prismaMock.calendarEvent.findMany.mockResolvedValue(
      audiences.map((audience, i) => manualRow({ id: 700 + i, audience })),
    )

    const res = await getCalendarFeed()

    expect(res.payload?.map((e) => e.audience).sort()).toEqual(['ALL', 'STUDENT'])
  })

  test('staff see ALL and FACULTY, never STUDENT', async () => {
    sessionMock.mockResolvedValue(sessionFor('FACULTY'))
    prismaMock.student.findFirst.mockResolvedValue(null)
    prismaMock.faculty.findFirst.mockResolvedValue({
      isProgramChair: false,
      adviser: { id: 5, groups: [] },
      coordinator: null,
    })
    prismaMock.calendarEvent.findMany.mockResolvedValue(
      audiences.map((audience, i) => manualRow({ id: 700 + i, audience })),
    )

    const res = await getCalendarFeed()

    expect(res.payload?.map((e) => e.audience).sort()).toEqual(['ALL', 'FACULTY'])
  })

  test('a privileged caller sees every audience', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.calendarEvent.findMany.mockResolvedValue(
      audiences.map((audience, i) => manualRow({ id: 700 + i, audience })),
    )

    const res = await getCalendarFeed()

    expect(res.payload).toHaveLength(3)
  })
})

describe('getCalendarFeed — defense time handling (Manila wall clock)', () => {
  test('a 09:00 defense serializes to 01:00Z regardless of the host timezone', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.defenseSchedule.findMany.mockResolvedValue([defenseRow()])

    const res = await getCalendarFeed()

    expect(res.payload?.[0].start).toBe('2026-04-15T01:00:00.000Z')
    expect(res.payload?.[0].end).toBe('2026-04-15T02:00:00.000Z')
    expect(res.payload?.[0].allDay).toBe(false)
  })

  test('an early-morning defense keeps its Manila day cell (07:00 → previous UTC day)', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow({ startTime: '07:00', endTime: '08:00' }),
    ])

    const res = await getCalendarFeed()

    // 07:00 Manila is 23:00Z the previous day. FullCalendar re-renders it at
    // 07:00 on the correct local day; a server-local parse would not.
    expect(res.payload?.[0].start).toBe('2026-04-14T23:00:00.000Z')
  })

  test('an evening defense does not spill into the next UTC day', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow({ startTime: '21:00', endTime: '22:00' }),
    ])

    const res = await getCalendarFeed()

    expect(res.payload?.[0].start).toBe('2026-04-15T13:00:00.000Z')
  })

  test('a missing or malformed time degrades to a date-only all-day event', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow({ startTime: '', endTime: 'not-a-time' }),
    ])

    const res = await getCalendarFeed()

    expect(res.payload?.[0].start).toBe('2026-04-15T00:00:00.000Z')
    expect(res.payload?.[0].end).toBe('2026-04-15T00:00:00.000Z')
    expect(res.payload?.[0].allDay).toBe(true)
  })

  test('proposal and final defenses carry different colors', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow({ id: 501, type: 'PROPOSAL' }),
      defenseRow({ id: 502, type: 'FINAL' }),
    ])

    const res = await getCalendarFeed()

    const proposal = res.payload?.find((e) => e.id === 'defense-501')
    const final = res.payload?.find((e) => e.id === 'defense-502')
    expect(proposal?.color).not.toBe(final?.color)
    expect(proposal?.title).toContain('Proposal Defense')
    expect(final?.title).toContain('Final Defense')
  })

  test('the feed is sorted oldest first', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow({ id: 502, date: new Date('2026-05-01T00:00:00.000Z') }),
      defenseRow({ id: 501, date: new Date('2026-04-15T00:00:00.000Z') }),
    ])

    const res = await getCalendarFeed()

    expect(res.payload?.map((e) => e.id)).toEqual(['defense-501', 'defense-502'])
  })
})

describe('getCalendarFeed — failure handling', () => {
  test('a cached-source failure surfaces an explicit error, not an empty feed', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.defenseSchedule.findMany.mockRejectedValue(new Error('db down'))

    const res = await getCalendarFeed()

    expect(res.success).toBe(false)
    expect(res.message).toBe('Failed to load calendar events.')
    expect(res.payload).toBeNull()
  })

  test('the prerender rejection path stays silent (empty message, not an error)', async () => {
    // resolveCalendarScope() runs before the cached readers, so this is where a
    // prerender-only rejection surfaces. The page treats an empty message as
    // "no error to show" and streams the real payload per request instead.
    sessionMock.mockRejectedValue(new Error('During prerendering, dynamic server usage'))

    const res = await getCalendarFeed()

    expect(res.success).toBe(false)
    expect(res.message).toBe('')
  })

  test('a HANGING_PROMISE_REJECTION digest is also treated as prerender noise', async () => {
    const prerenderError = Object.assign(new Error('boom'), {
      digest: 'HANGING_PROMISE_REJECTION',
    })
    sessionMock.mockRejectedValue(prerenderError)

    const res = await getCalendarFeed()

    expect(res.success).toBe(false)
    expect(res.message).toBe('')
  })
})

describe('getCalendarFeed — manual event priority colors', () => {
  const PRIORITY_CASES = [
    ['NONE', '#707dff'],
    ['LOW', '#64748b'],
    ['MEDIUM', '#b45309'],
    ['HIGH', '#c2410d'],
  ] as const

  test.each(PRIORITY_CASES)(
    'a %s priority event resolves to %s',
    async (priority, expected) => {
      sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
      prismaMock.calendarEvent.findMany.mockResolvedValue([
        manualRow({ id: 700 + PRIORITY_CASES.findIndex(([p]) => p === priority), priority }),
      ])

      const res = await getCalendarFeed()

      expect(res.payload?.[0].color).toBe(expected)
    },
  )

  test('the four levels resolve to four distinct colors', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.calendarEvent.findMany.mockResolvedValue(
      PRIORITY_CASES.map(([priority], i) => manualRow({ id: 800 + i, priority })),
    )

    const res = await getCalendarFeed()

    const colors = res.payload?.map((e) => e.color) ?? []
    expect(new Set(colors).size).toBe(4)
  })

  test('priority never collides with the final-defense red', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      manualRow({ id: 810, priority: 'HIGH' }),
    ])
    prismaMock.defenseSchedule.findMany.mockResolvedValue([
      defenseRow({ id: 811, type: 'FINAL' }),
    ])

    const res = await getCalendarFeed()
    const high = res.payload?.find((e) => e.kind === 'manual')
    const final = res.payload?.find((e) => e.kind === 'defense')

    expect(high?.color).not.toBe(final?.color)
    expect(final?.color).toBe('#fe6f6f')
  })

  test('an unknown stored priority falls back to the neutral indigo', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      manualRow({ id: 820, priority: 'URGENT' }),
    ])

    const res = await getCalendarFeed()

    expect(res.payload?.[0].color).toBe('#707dff')
  })

  test('defenses carry no priority and keep their type color', async () => {
    sessionMock.mockResolvedValue(sessionFor('SUPERADMIN'))
    prismaMock.defenseSchedule.findMany.mockResolvedValue([defenseRow()])

    const res = await getCalendarFeed()

    expect(res.payload?.[0].priority).toBeNull()
    expect(res.payload?.[0].color).toBe('#707dff')
  })
})

describe('createCalendarEvent', () => {
  const chairSession = sessionFor('FACULTY', { isProgramChair: true })

  beforeEach(() => {
    guardMock.mockResolvedValue(chairSession)
    prismaMock.calendarEvent.create.mockResolvedValue(
      manualRow({ id: 900, title: 'Capstone Kickoff' }),
    )
  })

  test('refuses a caller without the chair/admin guard', async () => {
    guardMock.mockResolvedValue(null)

    const res = await createCalendarEvent(null, { title: 'X' })

    expect(res.success).toBe(false)
    expect(res.message).toBe('You are not authorized to perform this action.')
    expect(prismaMock.calendarEvent.create).not.toHaveBeenCalled()
  })

  test('requires a title', async () => {
    const res = await createCalendarEvent(null, { title: '   ' })

    expect(res.message).toBe('Title is required.')
    expect(prismaMock.calendarEvent.create).not.toHaveBeenCalled()
  })

  test('rejects an over-long title', async () => {
    const res = await createCalendarEvent(null, { title: 'a'.repeat(201) })

    expect(res.message).toBe('Title must be at most 200 characters.')
  })

  test('requires parseable start and end dates', async () => {
    const res = await createCalendarEvent(null, { title: 'X', startsAt: 'nope' })

    expect(res.message).toBe('Valid start and end dates are required.')
  })

  test('rejects an end before the start', async () => {
    const res = await createCalendarEvent(null, {
      title: 'X',
      startsAt: '2026-05-02T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
    })

    expect(res.message).toBe('End date must be on or after the start date.')
  })

  test('rejects an unknown audience', async () => {
    const res = await createCalendarEvent(null, {
      title: 'X',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
      audience: 'GHOSTS',
    })

    expect(res.message).toBe('Audience must be STUDENT, FACULTY, or ALL.')
  })

  test('defaults allDay to true and audience to ALL when omitted', async () => {
    const res = await createCalendarEvent(null, {
      title: 'Capstone Kickoff',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
    })

    expect(res.success).toBe(true)
    const arg = prismaMock.calendarEvent.create.mock.calls[0][0] as any
    expect(arg.data.allDay).toBe(true)
    expect(arg.data.audience).toBe('ALL')
  })

  test('stamps createdById from the session, never from the payload', async () => {
    await createCalendarEvent(null, {
      title: 'Capstone Kickoff',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
    })

    const arg = prismaMock.calendarEvent.create.mock.calls[0][0] as any
    expect(arg.data.createdById).toBe(USER_ID)
  })

  test('writes a CALENDAR_CREATE audit row and invalidates the feed', async () => {
    const res = await createCalendarEvent(null, {
      title: 'Capstone Kickoff',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
    })

    expect(res.success).toBe(true)
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CALENDAR_CREATE', entity: 'CALENDAR', before: null }),
    )
    expect(revalidateCalendarMock).toHaveBeenCalled()
  })

  test('defaults priority to NONE when omitted', async () => {
    await createCalendarEvent(null, {
      title: 'Capstone Kickoff',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
    })

    const arg = prismaMock.calendarEvent.create.mock.calls[0][0] as any
    expect(arg.data.priority).toBe('NONE')
  })

  test('stores an explicit priority', async () => {
    await createCalendarEvent(null, {
      title: 'Defense Week',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
      priority: 'HIGH',
    })

    const arg = prismaMock.calendarEvent.create.mock.calls[0][0] as any
    expect(arg.data.priority).toBe('HIGH')
  })

  test('rejects an unknown priority', async () => {
    const res = await createCalendarEvent(null, {
      title: 'X',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
      priority: 'URGENT',
    })

    expect(res.message).toBe('Priority must be NONE, LOW, MEDIUM, or HIGH.')
    expect(prismaMock.calendarEvent.create).not.toHaveBeenCalled()
  })

  test('records the priority in the audit payload', async () => {
    prismaMock.calendarEvent.create.mockResolvedValue(
      manualRow({ id: 901, title: 'Defense Week', priority: 'HIGH' }),
    )

    await createCalendarEvent(null, {
      title: 'Defense Week',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
      priority: 'HIGH',
    })

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        after: expect.objectContaining({ priority: 'HIGH' }),
      }),
    )
  })
})

describe('updateCalendarEvent', () => {
  const chairSession = sessionFor('FACULTY', { isProgramChair: true })
  const existing = {
    ...manualRow({ id: 701, title: 'Old Title', description: 'Keep me' }),
  }

  beforeEach(() => {
    guardMock.mockResolvedValue(chairSession)
    prismaMock.calendarEvent.findFirst.mockResolvedValue(existing)
    prismaMock.calendarEvent.update.mockResolvedValue({ ...existing, title: 'New Title' })
  })

  test('refuses a caller without the guard', async () => {
    guardMock.mockResolvedValue(null)

    const res = await updateCalendarEvent(701, { title: 'New Title' })

    expect(res.success).toBe(false)
    expect(prismaMock.calendarEvent.update).not.toHaveBeenCalled()
  })

  test('returns not-found for a missing or already-deleted row', async () => {
    prismaMock.calendarEvent.findFirst.mockResolvedValue(null)

    const res = await updateCalendarEvent(701, { title: 'New Title' })

    expect(res.message).toBe('Calendar event not found.')
  })

  test('rejects a non-positive id before touching the database', async () => {
    const res = await updateCalendarEvent(0, { title: 'New Title' })

    expect(res.message).toBe('Calendar event not found.')
    expect(prismaMock.calendarEvent.findFirst).not.toHaveBeenCalled()
  })

  test('keeps omitted fields at their stored values', async () => {
    const res = await updateCalendarEvent(701, { title: 'New Title' })

    expect(res.success).toBe(true)
    const arg = prismaMock.calendarEvent.update.mock.calls[0][0] as any
    expect(arg.data.title).toBe('New Title')
    expect(arg.data.description).toBe('Keep me')
    expect(arg.data.startsAt).toEqual(existing.startsAt)
    expect(arg.data.endsAt).toEqual(existing.endsAt)
    expect(arg.data.allDay).toBe(true)
    expect(arg.data.audience).toBe('ALL')
  })

  test('an explicit empty description clears it', async () => {
    await updateCalendarEvent(701, { description: '' })

    const arg = prismaMock.calendarEvent.update.mock.calls[0][0] as any
    expect(arg.data.description).toBeNull()
  })

  test('rejects an explicit blank title but allows an omitted one', async () => {
    const blank = await updateCalendarEvent(701, { title: '' })
    expect(blank.message).toBe('Title is required.')

    const omitted = await updateCalendarEvent(701, {})
    expect(omitted.success).toBe(true)
  })

  test('records a before/after diff in the audit row', async () => {
    await updateCalendarEvent(701, { title: 'New Title' })

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CALENDAR_UPDATE',
        before: expect.objectContaining({ title: 'Old Title' }),
        after: expect.objectContaining({ title: 'New Title' }),
      }),
    )
  })

  test('an omitted priority keeps the stored value', async () => {
    prismaMock.calendarEvent.findFirst.mockResolvedValue({ ...existing, priority: 'HIGH' })
    prismaMock.calendarEvent.update.mockResolvedValue({ ...existing, title: 'New Title', priority: 'HIGH' })

    await updateCalendarEvent(701, { title: 'New Title' })

    const arg = prismaMock.calendarEvent.update.mock.calls[0][0] as any
    expect(arg.data.priority).toBe('HIGH')
  })

  test('an explicit empty priority resets to NONE', async () => {
    prismaMock.calendarEvent.findFirst.mockResolvedValue({ ...existing, priority: 'HIGH' })

    await updateCalendarEvent(701, { priority: '' })

    const arg = prismaMock.calendarEvent.update.mock.calls[0][0] as any
    expect(arg.data.priority).toBe('NONE')
  })

  test('rejects an unknown priority without writing', async () => {
    const res = await updateCalendarEvent(701, { priority: 'URGENT' })

    expect(res.message).toBe('Priority must be NONE, LOW, MEDIUM, or HIGH.')
    expect(prismaMock.calendarEvent.update).not.toHaveBeenCalled()
  })
})

describe('deleteCalendarEvent', () => {
  const chairSession = sessionFor('FACULTY', { isProgramChair: true })

  beforeEach(() => {
    guardMock.mockResolvedValue(chairSession)
    prismaMock.calendarEvent.findFirst.mockResolvedValue({ id: 701, title: 'Old Title' })
    prismaMock.calendarEvent.update.mockResolvedValue({})
  })

  test('refuses a caller without the guard', async () => {
    guardMock.mockResolvedValue(null)

    const res = await deleteCalendarEvent(701)

    expect(res.success).toBe(false)
    expect(prismaMock.calendarEvent.update).not.toHaveBeenCalled()
  })

  test('soft-deletes via deletedAt rather than removing the row', async () => {
    const res = await deleteCalendarEvent(701)

    expect(res.success).toBe(true)
    const arg = prismaMock.calendarEvent.update.mock.calls[0][0] as any
    expect(arg.data.deletedAt).toBeInstanceOf(Date)
    // prisma.calendarEvent.delete must never be reached — the model is not
    // even mocked, so a hard delete would throw.
  })

  test('records a CALENDAR_DELETE audit row and invalidates the feed', async () => {
    await deleteCalendarEvent(701)

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CALENDAR_DELETE',
        before: expect.objectContaining({ deletedAt: null }),
      }),
    )
    expect(revalidateCalendarMock).toHaveBeenCalled()
  })

  test('returns not-found for an already-deleted row', async () => {
    prismaMock.calendarEvent.findFirst.mockResolvedValue(null)

    const res = await deleteCalendarEvent(701)

    expect(res.message).toBe('Calendar event not found.')
  })
})
