import type { MilestoneKey } from '@prisma/client'

export const CAPSTONE1_KEYS: MilestoneKey[] = [
  'CHAPTER_1',
  'CHAPTER_2',
  'CHAPTER_3',
  'PROPOSAL_DEFENSE',
]

export const CAPSTONE2_KEYS: MilestoneKey[] = [
  'CHAPTER_4',
  'CHAPTER_5',
  'FINAL_DEFENSE',
  'ARCHIVING',
]

export const ALL_MILESTONE_KEYS: MilestoneKey[] = [...CAPSTONE1_KEYS, ...CAPSTONE2_KEYS]

export function keysForPhase(phase: 'CAPSTONE 1' | 'CAPSTONE 2'): MilestoneKey[] {
  return phase === 'CAPSTONE 1' ? CAPSTONE1_KEYS : CAPSTONE2_KEYS
}

export function phaseForKey(key: MilestoneKey): 'CAPSTONE 1' | 'CAPSTONE 2' {
  return (CAPSTONE2_KEYS as string[]).includes(key) ? 'CAPSTONE 2' : 'CAPSTONE 1'
}

export function countOpen(keys: MilestoneKey[], availability: Record<string, boolean>): number {
  return keys.filter((k) => !!availability[k]).length
}
