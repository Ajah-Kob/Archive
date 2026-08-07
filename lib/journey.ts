// Shared capstone journey derivation.
//
// NOT a 'use server' module: it exports a plain function + type that both
// lib/actions/groups.ts (student workspace) and lib/actions/sections.ts
// (coordinator progress) import. 'use server' files can only export async
// functions, so this logic lives outside of lib/actions/.

import type { JourneyRow } from '@/types/milestones'

const CHAPTER_SLUG: Record<string, string> = {
  CHAPTER_1: 'chapter-1',
  CHAPTER_2: 'chapter-2',
  CHAPTER_3: 'chapter-3',
  CHAPTER_4: 'chapter-4',
  CHAPTER_5: 'chapter-5',
}

export type JourneySource = {
  topics: { status: string; deletedAt: Date | null }[]
  capstone: { topicId: number } | null
  milestones: {
    chapter: string
    submissions: { status: string }[]
  }[]
  capstoneArchive: { deletedAt: Date | null } | null
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

// Derives the 8 journey rows from a group's data. Passing `null` (groupless)
// renders every row locked — there is no data to derive from. `capstone2Open`
// gates the Chapter 4/5 rows: they unlock (DEFAULT) once the coordinator opens
// Capstone 2 for the section, until a Milestone row drives their state.
export function buildJourneyRows(
  group: JourneySource | null,
  capstone2Open = false,
): JourneyRow[] {
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
    state: 'LOCKED',
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
    } else if (
      capstone2Open &&
      (slug === 'chapter-4' || slug === 'chapter-5')
    ) {
      // Capstone 2 is open for the section — chapters 4/5 are available even
      // before a Milestone row exists (rows are created by the capstone workspace).
      row.state = 'DEFAULT'
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
