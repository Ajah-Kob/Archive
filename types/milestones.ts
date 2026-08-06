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

export interface JourneyRow {
  slug: string
  label: string
  header: 'INITIAL' | 'CAPSTONE 1' | 'CAPSTONE 2' | 'FINAL'
  state: JourneyState
  sublabel?: string
}

export const JOURNEY_ROWS: ReadonlyArray<Omit<JourneyRow, 'state' | 'sublabel'>> =
  [
    { slug: 'topic-submission', label: 'Topic Submission', header: 'INITIAL' },
    { slug: 'topic-selection', label: 'Topic Selection', header: 'INITIAL' },
    { slug: 'chapter-1', label: 'Chapter 1', header: 'CAPSTONE 1' },
    { slug: 'chapter-2', label: 'Chapter 2', header: 'CAPSTONE 1' },
    { slug: 'chapter-3', label: 'Chapter 3', header: 'CAPSTONE 1' },
    { slug: 'chapter-4', label: 'Chapter 4', header: 'CAPSTONE 2' },
    { slug: 'chapter-5', label: 'Chapter 5', header: 'CAPSTONE 2' },
    { slug: 'archiving', label: 'Archiving', header: 'FINAL' },
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
