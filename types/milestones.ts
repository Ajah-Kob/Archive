// Shared types + constants for the student capstone journey (/milestones).
// Imported by server actions (lib/actions/groups.ts) and client components.
// Kept out of `lib/actions/` because 'use server' files can only export async
// functions — value exports must live here.

export const GROUP_CAP = 5
export const TOPIC_CAP = 3
export const ADVISER_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type JourneyState =
  | 'LOCKED'
  | 'DEFAULT'
  | 'SUBMITTED'
  | 'NEEDS_REVISION'
  | 'APPROVED'
  | 'NO_VERDICT'
  | 'MINOR_REVISION'
  | 'MAJOR_REVISION'
  | 'REJECTED'

export interface JourneyRow {
  slug: string
  label: string
  header: 'CAPSTONE 1' | 'CAPSTONE 2'
  state: JourneyState
  sublabel?: string
  /** Overrides the generic status text in tooltips (e.g., 'Selected'). */
  stateLabel?: string
  /** Extra tooltip line, e.g., '2 of 3 topics approved'. */
  tooltipDetail?: string
}

export const JOURNEY_ROWS: ReadonlyArray<Omit<JourneyRow, 'state' | 'sublabel'>> =
  [
    { slug: 'topic-submission', label: 'Topic Submission', header: 'CAPSTONE 1' },
    { slug: 'topic-selection', label: 'Topic Selection', header: 'CAPSTONE 1' },
    { slug: 'chapter-1', label: 'Chapter 1', header: 'CAPSTONE 1' },
    { slug: 'chapter-2', label: 'Chapter 2', header: 'CAPSTONE 1' },
    { slug: 'chapter-3', label: 'Chapter 3', header: 'CAPSTONE 1' },
    { slug: 'proposal-defense', label: 'Proposal Defense', header: 'CAPSTONE 1' },
    { slug: 'chapter-4', label: 'Chapter 4', header: 'CAPSTONE 2' },
    { slug: 'chapter-5', label: 'Chapter 5', header: 'CAPSTONE 2' },
    { slug: 'final-defense', label: 'Final Defense', header: 'CAPSTONE 2' },
    { slug: 'archiving', label: 'Archiving', header: 'CAPSTONE 2' },
  ]

export const WORKSPACE_SLUGS = JOURNEY_ROWS.map((row) => row.slug)

export interface WorkspaceMember {
  id: number
  userId: number
  name: string
  email: string
  image: string | null
  isLeader: boolean
}

export type AdviserState =
  | { state: 'none'; canManage: boolean }
  | {
      state: 'pending'
      canManage: boolean
      invitationId: number
      facultyId: number
      name?: string
      email?: string
      image?: string | null
    }
  | {
      state: 'assigned'
      canManage: boolean
      facultyId: number
      name: string
      email: string
      image: string | null
      workload: number
      atCap: boolean
    }

export interface WorkspaceInvite {
  id: number
  studentId: number
  name: string
  email: string
  image: string | null
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
}

export interface WorkspaceGroup {
  id: number
  name: string
  isLeader: boolean
  memberCount: number
  pendingCount: number
  members: WorkspaceMember[]
  adviser: AdviserState
  invitations: WorkspaceInvite[]
}

export interface WorkspaceData {
  student: {
    id: number
    userId: number
    name: string
    email: string
    image: string | null
  }
  section: { id: number; name: string }
  group: WorkspaceGroup | null
  journey: JourneyRow[]
}

export interface Classmate {
  id: number
  userId: number
  name: string
  email: string
  image: string | null
  invited: boolean
}

export interface AdviserOption {
  id: number
  userId: number
  name: string
  email: string
  image: string | null
  workload: number
  atCap: boolean
}

export type TopicSubmissionStatus = 'PENDING' | 'APPROVED' | 'NEED_REVISION'

export interface TopicActionResult {
  success: boolean
  message: string
}

export interface TopicSubmissionItem {
  id: number
  title: string
  background: string
  status: TopicSubmissionStatus
  version: number
  index: number
  createdAt: string
  updatedAt: string
  reviewNote: string | null
  reviewedAt: string | null
  submittedBy: string | null
  selectedAt?: string | null
}

export interface TopicSelectionPayload {
  group: {
    id: number
    groupName: string
    sectionId: number
  } | null
  journey: JourneyRow[]
  topics: TopicSubmissionItem[]
  confirmedTopicId: number | null
}

export interface TopicSubmissionPayload {
  group: {
    id: number
    groupName: string
    sectionId: number
  } | null
  journey: JourneyRow[]
  topics: TopicSubmissionItem[]
  history: TopicSubmissionItem[]
  count: number
  cap: number
  hasApproved: boolean
  canSubmit: boolean
}

export type ChapterKey =
  | 'CHAPTER_1'
  | 'CHAPTER_2'
  | 'CHAPTER_3'
  | 'CHAPTER_4'
  | 'CHAPTER_5'

export const SLUG_TO_CHAPTER: Record<string, ChapterKey> = {
  'chapter-1': 'CHAPTER_1',
  'chapter-2': 'CHAPTER_2',
  'chapter-3': 'CHAPTER_3',
  'chapter-4': 'CHAPTER_4',
  'chapter-5': 'CHAPTER_5',
}

export const CHAPTER_LABELS: Record<ChapterKey, string> = {
  CHAPTER_1: 'Chapter 1',
  CHAPTER_2: 'Chapter 2',
  CHAPTER_3: 'Chapter 3',
  CHAPTER_4: 'Chapter 4',
  CHAPTER_5: 'Chapter 5',
}

export const CHAPTER_PHASE: Record<ChapterKey, 'CAPSTONE 1' | 'CAPSTONE 2'> = {
  CHAPTER_1: 'CAPSTONE 1',
  CHAPTER_2: 'CAPSTONE 1',
  CHAPTER_3: 'CAPSTONE 1',
  CHAPTER_4: 'CAPSTONE 2',
  CHAPTER_5: 'CAPSTONE 2',
}

export type ChapterViewState =
  | 'DEFAULT'
  | 'IN_REVIEW'
  | 'NEEDS_REVISION'
  | 'APPROVED'

export type SubmissionViewStatus =
  | 'IN_REVIEW'
  | 'NEEDS_REVISION'
  | 'APPROVED'
  | 'SUPERSEDED'

/** Submission metadata for the adviser document workspace. */
export interface SubmissionMeta {
  id: number
  groupName: string
  chapter: string
  phase: 'CAPSTONE 1' | 'CAPSTONE 2'
  submittedBy: string
  dateSubmitted: string
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
  status: SubmissionViewStatus
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
}

export interface ChapterVersionItem {
  id: number
  version: number
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
  status: SubmissionViewStatus
  submittedBy: string
  submittedAt: string
  reviewedAt: string | null
  reviewNote: string | null
  isCurrent: boolean
  commentCount: number
}

export interface ChapterSubmissionPayload {
  chapter: {
    key: ChapterKey
    label: string
    phase: 'CAPSTONE 1' | 'CAPSTONE 2'
  }
  open: boolean
  milestoneId: number | null
  current: ChapterVersionItem | null
  history: ChapterVersionItem[]
  state: ChapterViewState
  canSubmit: boolean
  requiresCapstone: boolean
  journey: JourneyRow[]
}
