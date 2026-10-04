// Pure helpers for the defense-scheduling wizard's panelist slots.
// No DB, no side effects — the assignment logic lives here rather than inside
// CreateDefenseWizard's setState callback so it can be tested directly.

import type { FacultyMember, PanelSlot, PanelSlotState } from '@/components/defense-scheduling/wizard/types'

/**
 * Slot order. Stated rather than inferred because TypeScript only recovers the
 * key union of PanelSlotState inside a mapped type.
 */
export const PANEL_SLOT_ORDER: readonly PanelSlot[] = ['chair', 'member1', 'member2']

/**
 * Put `member` into `slot`, and swap when that seat is already taken.
 *
 * Previously the seat was overwritten outright, so assigning into an occupied
 * Panel Chair silently returned the chair to the faculty pool — a panelist could
 * be demoted without the user ever being told. The incumbent now takes the seat
 * the incoming member vacated.
 *
 * Three cases, and the third is the subtle one:
 * - seat empty, member unassigned — plain assign
 * - seat empty, member in another seat — member moves, its old seat empties
 * - seat taken by someone else, member came from a seat — the two exchange
 * - seat taken by someone else, member came from the pool — nothing to exchange,
 *   so the incumbent is dropped and returns to the pool
 *
 * Re-tapping the seat a member already holds is a no-op: the incumbent *is* that
 * member, so the id guard skips the swap and the state comes back unchanged.
 */
export function assignFacultyToSlot(
  slots: PanelSlotState,
  slot: PanelSlot,
  member: FacultyMember,
): PanelSlotState {
  const next = { ...slots }

  // Where the incoming member currently sits, read before the seat is written.
  const origin = PANEL_SLOT_ORDER.find((s) => next[s]?.id === member.id)
  const incumbent = next[slot]

  // A faculty member can only occupy one slot.
  for (const s of PANEL_SLOT_ORDER) {
    if (next[s]?.id === member.id) next[s] = null
  }

  next[slot] = member

  // Only a real displacement swaps. Same id means the member already held this
  // seat and nothing should move.
  if (origin && incumbent && incumbent.id !== member.id) {
    next[origin] = incumbent
  }

  return next
}