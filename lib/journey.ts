// Shared capstone journey derivation.
//
// NOT a 'use server' module: it exports a plain function + type that both
// lib/actions/groups.ts (student workspace) and lib/actions/sections.ts
// (coordinator progress) import. 'use server' files can only export async
// functions, so this logic lives outside of lib/actions/.

import { TOPIC_CAP, type JourneyRow } from '@/types/milestones'

const CHAPTER_SLUG: Record<string, string> = {
  CHAPTER_1: 'chapter-1',
  CHAPTER_2: 'chapter-2',
  CHAPTER_3: 'chapter-3',
  CHAPTER_4: 'chapter-4',
  CHAPTER_5: 'chapter-5',
}

const CHAPTER_KEYS = [
  'CHAPTER_1',
  'CHAPTER_2',
  'CHAPTER_3',
  'CHAPTER_4',
  'CHAPTER_5',
] as const

export type JourneySource = {
  topics: { status: string; deletedAt: Date | null }[]
  capstone: { topicId: number } | null
  milestones: {
    chapter: string
    submissions: { status: string; deletedAt: Date | null }[]
  }[]
  capstoneArchive: { deletedAt: Date | null } | null
}

// Statically built groupless journey (all locked) so we never allocate it per request.
const JOURNEY_ROWS_EMPTY: JourneyRow[] = [
  { slug: 'topic-submission', label: 'Topic Submission', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'topic-selection', label: 'Topic Selection', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'chapter-1', label: 'Chapter 1', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'chapter-2', label: 'Chapter 2', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'chapter-3', label: 'Chapter 3', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'chapter-4', label: 'Chapter 4', header: 'CAPSTONE 2', state: 'LOCKED' },
  { slug: 'chapter-5', label: 'Chapter 5', header: 'CAPSTONE 2', state: 'LOCKED' },
  { slug: 'archiving', label: 'Archiving', header: 'CAPSTONE 2', state: 'LOCKED' },
]

// A single row of a section's milestone-availability table.
export type SectionAvailabilityRow = { key: string; openedAt: Date | null }

// Resolves each milestone's open/locked flag for a section. Explicit rows win
// (openedAt set -> open, null -> locked); missing rows fall back to: Topic
// Submission open by default, Chapters 4/5 following the capstone2 phase gate,
// everything else locked. Mirrors the coordinator's management UI so both sides
// read the same source of truth.
export function resolveSectionAvailability(
  capstone2Open: boolean,
  rows: SectionAvailabilityRow[],
): Record<string, boolean> {
  const explicit = new Map(rows.map((r) => [r.key, r.openedAt != null]))
  const keys = ['TOPIC_SUBMISSION', 'TOPIC_SELECTION', ...CHAPTER_KEYS, 'ARCHIVING']
  const out: Record<string, boolean> = {}
  for (const key of keys) {
    if (explicit.has(key)) {
      out[key] = explicit.get(key)!
    } else if (key === 'TOPIC_SUBMISSION') {
      out[key] = true
    } else if (key === 'CHAPTER_4' || key === 'CHAPTER_5') {
      out[key] = capstone2Open
    } else {
      out[key] = false
    }
  }
  return out
}

// Derives the 8 journey rows from a group's data and the section's milestone
// availability. Passing `null` (groupless) renders every row locked — there is
// no data to derive from. `availability` is the coordinator's per-milestone
// gate (see resolveSectionAvailability): locked milestones stay locked, open
// milestones surface the group's actual progress.
export function buildJourneyRows(
  group: JourneySource | null,
  availability: Record<string, boolean> = {},
): JourneyRow[] {
  if (!group) {
    return JOURNEY_ROWS_EMPTY
  }

  const isOpen = (key: string) => availability[key] ?? key === 'TOPIC_SUBMISSION'

  const topics = group.topics.filter((t) => !t.deletedAt)
  const approved = topics.filter((t) => t.status === 'APPROVED')

  const rows: JourneyRow[] = []

  // Topic Submission — gated by availability. The node only turns APPROVED
  // once ALL topic slots are approved (TOPIC_CAP); any unapproved slot keeps
  // it in the default state. Hover shows the running approved count.
  const topicsApproved = approved.length
  const topicDetail = `${topicsApproved} of ${TOPIC_CAP} topics approved`
  const topicSubmission: JourneyRow = {
    slug: 'topic-submission',
    label: 'Topic Submission',
    header: 'CAPSTONE 1',
    state: 'LOCKED',
  }
  if (isOpen('TOPIC_SUBMISSION')) {
    if (topicsApproved >= TOPIC_CAP) {
      topicSubmission.state = 'APPROVED'
      topicSubmission.sublabel = 'All topics approved'
    } else {
      topicSubmission.state = 'DEFAULT'
    }
    topicSubmission.tooltipDetail = topicDetail
  }
  rows.push(topicSubmission)

  // Topic Selection — gated by the coordinator's availability. Green check
  // labeled "Selected" (not "Approved") once a topic has been confirmed via
  // the capstone link; hover carries the same approved-topics count.
  const topicSelection: JourneyRow = {
    slug: 'topic-selection',
    label: 'Topic Selection',
    header: 'CAPSTONE 1',
    state: 'LOCKED',
  }
  if (isOpen('TOPIC_SELECTION')) {
    if (group.capstone?.topicId) {
      topicSelection.state = 'APPROVED'
      topicSelection.sublabel = 'Selected'
      topicSelection.stateLabel = 'Selected'
    } else {
      topicSelection.state = 'DEFAULT'
    }
    topicSelection.tooltipDetail = topicDetail
  }
  rows.push(topicSelection)

  // Chapters — render from Milestone rows when they exist (created by the
  // capstone workspace); otherwise the coordinator gate keeps them locked.
  const milestoneByChapter = new Map(
    group.milestones.map((m) => [m.chapter, m]),
  )
  for (const chapter of CHAPTER_KEYS) {
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
    if (isOpen(chapter)) {
      if (milestone) {
        // The CURRENT live submission decides the row state — never a
        // soft-deleted (superseded) one, regardless of query ordering.
        const latest = milestone.submissions.find((s) => !s.deletedAt) ?? null
        if (!latest) {
          row.state = 'DEFAULT'
        } else if (latest.status === 'APPROVED') {
          row.state = 'APPROVED'
          row.sublabel = 'Approved'
        } else if (latest.status === 'NEED_REVISION') {
          row.state = 'NEEDS_REVISION'
          row.sublabel = 'Need Revision'
        } else {
          row.state = 'SUBMITTED'
          row.sublabel = 'In Review'
        }
      } else {
        // The coordinator opened the milestone but the group hasn't started —
        // the step is available.
        row.state = 'DEFAULT'
      }
    }
    rows.push(row)
  }

  // Archiving — gated by availability, green once archived.
  const archiving: JourneyRow = {
    slug: 'archiving',
    label: 'Archiving',
    header: 'CAPSTONE 2',
    state: 'LOCKED',
  }
  if (isOpen('ARCHIVING')) {
    if (group.capstoneArchive && !group.capstoneArchive.deletedAt) {
      archiving.state = 'APPROVED'
      archiving.sublabel = 'Archived'
    } else {
      archiving.state = 'DEFAULT'
    }
  }
  rows.push(archiving)

  return rows
}