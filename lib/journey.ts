// Shared capstone journey derivation.
//
// NOT a 'use server' module: it exports a plain function + type that both
// lib/actions/groups.ts (student workspace) and lib/actions/sections.ts
// (coordinator progress) import. 'use server' files can only export async
// functions, so this logic lives outside of lib/actions/.

import type { JourneyRow } from '@/types/milestones'
import { CAPSTONE1_KEYS, CAPSTONE2_KEYS } from '@/lib/milestones/phase'

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
  capstone: { topicId: number } | null
  milestones: {
    chapter: string
    submissions: { status: string; deletedAt: Date | null }[]
  }[]
  capstoneArchive: { deletedAt: Date | null } | null
  archivingSubmission?: { status: string; deletedAt: Date | null } | null
}

// Statically built groupless journey (all locked) so we never allocate it per request.
const JOURNEY_ROWS_EMPTY: JourneyRow[] = [
  { slug: 'chapter-1', label: 'Chapter 1', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'chapter-2', label: 'Chapter 2', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'chapter-3', label: 'Chapter 3', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'proposal-defense', label: 'Proposal Defense', header: 'CAPSTONE 1', state: 'LOCKED' },
  { slug: 'chapter-4', label: 'Chapter 4', header: 'CAPSTONE 2', state: 'LOCKED' },
  { slug: 'chapter-5', label: 'Chapter 5', header: 'CAPSTONE 2', state: 'LOCKED' },
  { slug: 'final-defense', label: 'Final Defense', header: 'CAPSTONE 2', state: 'LOCKED' },
  { slug: 'archiving', label: 'Archiving', header: 'CAPSTONE 2', state: 'LOCKED' },
]

// A single row of a section's milestone-availability table.
export type SectionAvailabilityRow = { key: string; openedAt: Date | null }

// Resolves each milestone's open/locked flag for a section. Phase gates
// (capstone1/2) take precedence over explicit rows — when a phase is locked,
// every milestone in that phase is considered locked even if its row says
// open. This powers the coordinator's "Capstone X locked" overlay and the
// student's journey lock state. Missing rows fall back to: Capstone 2 keys
// following capstone2OpenedAt, everything else locked.
export function resolveSectionAvailability(
  capstone1Open: boolean,
  capstone2Open: boolean,
  rows: SectionAvailabilityRow[],
): Record<string, boolean>
export function resolveSectionAvailability(
  capstone2Open: boolean,
  rows: SectionAvailabilityRow[],
): Record<string, boolean>
export function resolveSectionAvailability(
  a: boolean,
  b: boolean | SectionAvailabilityRow[],
  c?: SectionAvailabilityRow[],
): Record<string, boolean> {
  let capstone1Open: boolean
  let capstone2Open: boolean
  let rows: SectionAvailabilityRow[]
  if (Array.isArray(b)) {
    // legacy 2-arg call: (capstone2Open, rows) → assume capstone1 is open
    capstone1Open = true
    capstone2Open = a
    rows = b as SectionAvailabilityRow[]
  } else {
    capstone1Open = a
    capstone2Open = b as boolean
    rows = c as SectionAvailabilityRow[]
  }

  const explicit = new Map(rows.map((r) => [r.key, r.openedAt != null]))
  const keys = [
    ...CHAPTER_KEYS,
    'PROPOSAL_DEFENSE',
    'FINAL_DEFENSE',
    'ARCHIVING',
  ]
  const out: Record<string, boolean> = {}
  for (const key of keys) {
    // Phase gate overrides everything — locked phase means every key in that
    // phase is locked, regardless of its explicit row.
    if ((CAPSTONE1_KEYS as string[]).includes(key) && !capstone1Open) {
      out[key] = false
      continue
    }
    if ((CAPSTONE2_KEYS as string[]).includes(key) && !capstone2Open) {
      out[key] = false
      continue
    }
    if (explicit.has(key)) {
      out[key] = explicit.get(key)!
    } else if ((CAPSTONE2_KEYS as string[]).includes(key)) {
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

  const isOpen = (key: string) => availability[key] ?? false

  const rows: JourneyRow[] = []

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

    // Insert the defense step after its preceding chapter. Proposal Defense
    // follows Chapter 3 (end of Capstone 1); Final Defense follows Chapter 5
    // (end of Capstone 2). The step is gated by the coordinator's availability
    // (see resolveSectionAvailability): locked stays locked, open surfaces as
    // an available step. Defense state derivation (verdict / review status) is
    // wired separately — see lib/actions/student-defense.ts.
    if (chapter === 'CHAPTER_3') {
      const defense: JourneyRow = {
        slug: 'proposal-defense',
        label: 'Proposal Defense',
        header: 'CAPSTONE 1',
        state: 'LOCKED',
      }
      if (isOpen('PROPOSAL_DEFENSE')) {
        defense.state = 'DEFAULT'
      }
      rows.push(defense)
    } else if (chapter === 'CHAPTER_5') {
      const defense: JourneyRow = {
        slug: 'final-defense',
        label: 'Final Defense',
        header: 'CAPSTONE 2',
        state: 'LOCKED',
      }
      if (isOpen('FINAL_DEFENSE')) {
        defense.state = 'DEFAULT'
      }
      rows.push(defense)
    }
  }

  // Archiving — gated by availability, derives state from DB (IN_REVIEW → CAPSTONE_ARCHIVED).
  // READY_FOR_ARCHIVING maps to DEFAULT, IN_REVIEW maps to SUBMITTED (yellow), ARCHIVED maps to APPROVED (green).
  // This survives refresh because it reads persisted ArchivingSubmission + CapstoneArchive, not local state.
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
    } else if (
      group.archivingSubmission &&
      !group.archivingSubmission.deletedAt &&
      group.archivingSubmission.status === 'IN_REVIEW'
    ) {
      archiving.state = 'SUBMITTED'
      archiving.sublabel = 'In Review'
    } else if (
      group.archivingSubmission &&
      !group.archivingSubmission.deletedAt &&
      group.archivingSubmission.status === 'ARCHIVED'
    ) {
      // Fallback when archive row not yet synced — treat as archived
      archiving.state = 'APPROVED'
      archiving.sublabel = 'Archived'
    } else {
      archiving.state = 'DEFAULT'
    }
  }
  rows.push(archiving)

  return rows
}