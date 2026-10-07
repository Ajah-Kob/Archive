'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag, revalidateTag } from 'next/cache'
import {
  requireSchedulePanelist,
  requireScheduleStudent,
  unauthorized,
} from '@/lib/actions/guard'
import { revalidateFeature } from '@/lib/actions/revalidate'
import {
  SYSTEM_LINK_MESSAGE,
  isAllowedLinkUrl,
  linksAreEditable,
} from '@/lib/system-links'

// The acting user must see their own write immediately, so bust rather than let
// stale-while-revalidate serve the old value. Matches the annotations.ts form.
const FRESH = { expire: 0 } as const

const MAX_URL_LENGTH = 2048
const MAX_LABEL_LENGTH = 80
const MAX_NOTE_LENGTH = 280
const MAX_COMMENT_LENGTH = 2000

function fail(message: string) {
  return { success: false as const, message, payload: null }
}

function ok(message: string, payload: null = null) {
  return { success: true as const, message, payload }
}

/** Shapes the UI consumes, derived from the selects above so they cannot drift. */
export type PanelistSystemLink = {
  id: number
  label: string
  url: string
  note: string | null
  removedAt: Date | string | null
  updatedAt: Date | string
  createdBy: { name: string }
  _count: { comments: number }
}

export type StudentSystemLink = Omit<
  PanelistSystemLink,
  'removedAt'
> & {
  copiedFromId: number | null
}

export type SystemLinkCommentNode = {
  id: number
  body: string
  createdAt: Date | string
  author: { name: string }
}

/**
 * Panelist view of one defense: every link, including withdrawn ones, so a
 * panelist can see that a comment thread existed on something the group took
 * down. Comment counts included to avoid N+1 on the thread queries.
 *
 * The guard runs outside the cached scope because Next forbids dynamic data
 * (cookies/session) inside 'use cache'. Only the ids cross the boundary.
 */
export async function getSystemLinksForPanelist(scheduleId: number) {
  const access = await requireSchedulePanelist(scheduleId)
  if (!access) return { ...unauthorized, payload: null }

  const links = await cachedPanelistLinks(scheduleId)
  return { success: true as const, message: '', payload: { links } }
}

async function cachedPanelistLinks(scheduleId: number) {
  'use cache'
  cacheTag(`system-links-${scheduleId}`)
  cacheLife('max')

  return prisma.defenseSystemLink.findMany({
    where: { scheduleId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      label: true,
      url: true,
      note: true,
      removedAt: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      _count: { select: { comments: { where: { deletedAt: null } } } },
    },
  })
}

/**
 * Student view: the group's own links for this defense, verified by group
 * membership. Withdrawn links are hidden from students -- they never saw them go
 * away, and the discussion stays a panelist-side record.
 */
export async function getSystemLinksForStudent(scheduleId: number) {
  const access = await requireScheduleStudent(scheduleId)
  if (!access) return { ...unauthorized, payload: null }

  const links = await prisma.defenseSystemLink.findMany({
    where: {
      scheduleId,
      groupId: access.schedule.groupId,
      deletedAt: null,
      removedAt: null,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      label: true,
      url: true,
      note: true,
      updatedAt: true,
      copiedFromId: true,
      createdBy: { select: { name: true } },
      _count: { select: { comments: { where: { deletedAt: null } } } },
    },
  })
  return { success: true as const, message: '', payload: { links } }
}

/** Roots with their nested replies. Panelist-only: students get counts, not bodies. */
export async function getSystemLinkComments(linkId: number) {
  const link = await prisma.defenseSystemLink.findFirst({
    where: { id: linkId, deletedAt: null },
    select: { scheduleId: true },
  })
  if (!link) return fail('Link not found.')

  const access = await requireSchedulePanelist(link.scheduleId)
  if (!access) return { ...unauthorized, payload: null }

  const comments = await cachedLinkComments(linkId, link.scheduleId)
  return { success: true as const, message: '', payload: { comments } }
}

async function cachedLinkComments(linkId: number, scheduleId: number) {
  'use cache'
  cacheTag(`system-links-${scheduleId}`)
  cacheLife('max')

  return prisma.systemLinkComment.findMany({
    where: { linkId, deletedAt: null, parentId: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { name: true } },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
    },
  })
}

/**
 * Student-side comment read. Separate from getSystemLinkComments because the
 * guard differs: a student must belong to the link's group, not be a panelist.
 * Students read the discussion but can never write to it (decision 5).
 */
export async function getSystemLinkCommentsForStudent(linkId: number) {
  const link = await prisma.defenseSystemLink.findFirst({
    where: { id: linkId, deletedAt: null },
    select: { id: true, scheduleId: true, groupId: true },
  })
  if (!link) return fail('Link not found.')

  const access = await requireScheduleStudent(link.scheduleId)
  if (!access) return { ...unauthorized, payload: null }
  if (link.groupId !== access.schedule.groupId) return fail('Link not found.')

  const comments = await cachedLinkComments(linkId, link.scheduleId)
  return { success: true as const, message: '', payload: { comments } }
}

/** Validates the shared add/edit fields. Returns null when valid. */
function readLinkForm(formData: FormData) {
  const label = String(formData.get('label') ?? '').trim()
  const url = String(formData.get('url') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim() || null

  if (!label) return { error: SYSTEM_LINK_MESSAGE.INVALID_LABEL }
  if (label.length > MAX_LABEL_LENGTH) return { error: 'Label is too long.' }
  // Re-checked here, not trusted from the form: this value is rendered as an
  // anchor, so the scheme is validated server-side.
  if (!isAllowedLinkUrl(url) || url.length > MAX_URL_LENGTH)
    return { error: SYSTEM_LINK_MESSAGE.INVALID_URL }
  if (note && note.length > MAX_NOTE_LENGTH) return { error: 'Note is too long.' }

  return { label, url, note }
}

export async function addSystemLink(scheduleId: number, formData: FormData) {
  const access = await requireScheduleStudent(scheduleId)
  if (!access) return unauthorized
  if (!linksAreEditable(access.schedule.verdict))
    return fail(SYSTEM_LINK_MESSAGE.LOCKED)

  const parsed = readLinkForm(formData)
  if ('error' in parsed) return fail(parsed.error)

  await prisma.defenseSystemLink.create({
    data: {
      scheduleId,
      groupId: access.schedule.groupId,
      label: parsed.label,
      url: parsed.url,
      note: parsed.note,
      createdById: +access.session.user.id,
    },
  })

  revalidateTag(`system-links-${scheduleId}`, FRESH)
  revalidateFeature('defense')
  return ok('Link added.')
}

export async function updateSystemLink(linkId: number, formData: FormData) {
  const link = await prisma.defenseSystemLink.findFirst({
    where: { id: linkId, deletedAt: null },
    select: { id: true, scheduleId: true, groupId: true },
  })
  if (!link) return fail('Link not found.')

  const access = await requireScheduleStudent(link.scheduleId)
  if (!access) return unauthorized
  if (link.groupId !== access.schedule.groupId)
    return fail(SYSTEM_LINK_MESSAGE.INVALID_URL)
  if (!linksAreEditable(access.schedule.verdict))
    return fail(SYSTEM_LINK_MESSAGE.LOCKED)

  const parsed = readLinkForm(formData)
  if ('error' in parsed) return fail(parsed.error)

  await prisma.defenseSystemLink.update({
    where: { id: linkId },
    data: { label: parsed.label, url: parsed.url, note: parsed.note },
  })

  revalidateTag(`system-links-${link.scheduleId}`, FRESH)
  revalidateFeature('defense')
  return ok('Link updated.')
}

/**
 * Withdraws a link. Soft, never a hard delete: the set stays editable until the
 * verdict, so a group can remove a link a panelist has already commented on, and
 * that comment must survive.
 */
export async function removeSystemLink(linkId: number) {
  const link = await prisma.defenseSystemLink.findFirst({
    where: { id: linkId, deletedAt: null },
    select: { id: true, scheduleId: true, groupId: true },
  })
  if (!link) return fail('Link not found.')

  const access = await requireScheduleStudent(link.scheduleId)
  if (!access) return unauthorized
  if (link.groupId !== access.schedule.groupId) return fail('Link not found.')
  if (!linksAreEditable(access.schedule.verdict))
    return fail(SYSTEM_LINK_MESSAGE.LOCKED)

  await prisma.defenseSystemLink.update({
    where: { id: linkId },
    data: { removedAt: new Date(), deletedAt: new Date() },
  })

  revalidateTag(`system-links-${link.scheduleId}`, FRESH)
  revalidateFeature('defense')
  return ok('Link removed.')
}

/**
 * Pre-fills a defense's empty set from the same group's set for the other
 * DefenseType (decision 10). A copy, not a link between the two sets -- editing
 * the copy must not rewrite the source's history, which is what keeps each
 * defense's discussion independent.
 */
export async function copyProposalLinks(scheduleId: number) {
  const access = await requireScheduleStudent(scheduleId)
  if (!access) return unauthorized
  if (!linksAreEditable(access.schedule.verdict))
    return fail(SYSTEM_LINK_MESSAGE.LOCKED)

  const source = await prisma.defenseSchedule.findFirst({
    where: {
      groupId: access.schedule.groupId,
      type: access.schedule.type === 'FINAL' ? 'PROPOSAL' : 'FINAL',
      deletedAt: null,
      id: { not: scheduleId },
    },
    orderBy: { date: 'desc' },
    select: { id: true },
  })
  if (!source) return fail('No earlier defense links to copy.')

  const existing = await prisma.defenseSystemLink.count({
    where: { scheduleId, deletedAt: null, removedAt: null },
  })
  if (existing > 0) return fail('This defense already has links.')

  const copyable = await prisma.defenseSystemLink.findMany({
    where: { scheduleId: source.id, deletedAt: null, removedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, label: true, url: true, note: true },
  })
  if (copyable.length === 0) return fail('No earlier defense links to copy.')

  await prisma.defenseSystemLink.createMany({
    data: copyable.map((l) => ({
      scheduleId,
      groupId: access.schedule.groupId,
      label: l.label,
      url: l.url,
      note: l.note,
      copiedFromId: l.id,
      createdById: +access.session.user.id,
    })),
  })

  revalidateTag(`system-links-${scheduleId}`, FRESH)
  revalidateFeature('defense')
  return ok(`Copied ${copyable.length} link${copyable.length === 1 ? '' : 's'}.`)
}

export async function addSystemComment(linkId: number, formData: FormData) {
  const body = String(formData.get('body') ?? '').trim()
  if (!body) return fail('Write something first.')
  if (body.length > MAX_COMMENT_LENGTH) return fail('Comment is too long.')

  const link = await prisma.defenseSystemLink.findFirst({
    where: { id: linkId, deletedAt: null },
    select: { id: true, scheduleId: true },
  })
  if (!link) return fail('Link not found.')

  // Panelist-only. Students read comments but never write one (decision 5).
  const access = await requireSchedulePanelist(link.scheduleId)
  if (!access) return unauthorized

  await prisma.systemLinkComment.create({
    data: { linkId, body, authorId: +access.session.user.id },
  })

  revalidateTag(`system-links-${link.scheduleId}`, FRESH)
  return ok('Comment posted.')
}

/** Replies attach to a root comment only; a reply to a reply does not nest deeper. */
export async function replyToSystemComment(parentId: number, formData: FormData) {
  const body = String(formData.get('body') ?? '').trim()
  if (!body) return fail('Write something first.')
  if (body.length > MAX_COMMENT_LENGTH) return fail('Comment is too long.')

  const parent = await prisma.systemLinkComment.findFirst({
    where: { id: parentId, deletedAt: null, parentId: null },
    select: { id: true, link: { select: { id: true, scheduleId: true } } },
  })
  if (!parent) return fail('Comment not found.')

  const access = await requireSchedulePanelist(parent.link.scheduleId)
  if (!access) return unauthorized

  await prisma.systemLinkComment.create({
    data: {
      linkId: parent.link.id,
      parentId: parent.id,
      body,
      authorId: +access.session.user.id,
    },
  })

  revalidateTag(`system-links-${parent.link.scheduleId}`, FRESH)
  return ok('Reply posted.')
}