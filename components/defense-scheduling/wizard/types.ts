// Shared types for the Create/Edit Defense Schedule wizard steps.

export interface SectionOption {
  id: number
  name: string
}

export interface GroupOption {
  id: number
  name: string
  sectionId: number
  hasSchedule: boolean
  /** Defense types with a live schedule — drives per-type eligibility. */
  scheduledTypes: DefenseType[]
}

export interface FacultyMember {
  id: number
  name: string
  email?: string
}

export type PanelSlot = 'chair' | 'member1' | 'member2'

export interface PanelSlotState {
  chair: FacultyMember | null
  member1: FacultyMember | null
  member2: FacultyMember | null
}

export type DefenseType = 'PROPOSAL' | 'FINAL'

/** A taken time span ("HH:MM") on some date — drives disabled times. */
export interface TakenTimeRange {
  start: string
  end: string
}

export interface WizardActionResponse {
  success: boolean
  message: string
  payload?: unknown
}
