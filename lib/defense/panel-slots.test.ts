import { describe, expect, it } from '@jest/globals'
import { assignFacultyToSlot } from '@/lib/defense/panel-slots'
import type {
  FacultyMember,
  PanelSlotState,
} from '@/components/defense-scheduling/wizard/types'

const JUAN: FacultyMember = { id: 1, name: 'Juan Dela Cruz' }
const MARIA: FacultyMember = { id: 2, name: 'Maria Santos' }
const ANA: FacultyMember = { id: 3, name: 'Ana Reyes' }

function slots(partial: Partial<PanelSlotState>): PanelSlotState {
  return { chair: null, member1: null, member2: null, ...partial }
}

describe('assignFacultyToSlot', () => {
  it('fills an empty seat', () => {
    const result = assignFacultyToSlot(slots({}), 'chair', JUAN)
    expect(result).toEqual(slots({ chair: JUAN }))
  })

  it('moves a member out of their previous seat', () => {
    const result = assignFacultyToSlot(slots({ member1: JUAN }), 'chair', JUAN)
    expect(result).toEqual(slots({ chair: JUAN }))
  })

  // The bug this exists for: the chair used to be overwritten and its holder
  // quietly returned to the pool.
  it('swaps two seated members', () => {
    const result = assignFacultyToSlot(
      slots({ chair: MARIA, member1: JUAN }),
      'chair',
      JUAN,
    )
    expect(result).toEqual(slots({ chair: JUAN, member1: MARIA }))
  })

  it('swaps when dropping a chair holder into an occupied member seat', () => {
    // Ana is chair, Maria is member2. Sending Ana to member2 must move Maria up
    // to the vacated chair rather than dropping her.
    const result = assignFacultyToSlot(
      slots({ chair: ANA, member2: MARIA }),
      'member2',
      ANA,
    )
    expect(result).toEqual(slots({ chair: MARIA, member2: ANA }))
  })

  it('fills an empty member seat without disturbing the chair', () => {
    const result = assignFacultyToSlot(slots({ chair: MARIA }), 'member2', ANA)
    expect(result).toEqual(slots({ chair: MARIA, member2: ANA }))
  })

  it('returns the incumbent to the pool when the member came from the pool', () => {
    const result = assignFacultyToSlot(slots({ chair: MARIA }), 'chair', ANA)
    expect(result).toEqual(slots({ chair: ANA }))
  })

  it('is a no-op when re-tapping the seat a member already holds', () => {
    const before = slots({ chair: MARIA, member1: JUAN })
    const result = assignFacultyToSlot(before, 'chair', MARIA)
    expect(result).toEqual(before)
  })

  it('does not mutate the state it was given', () => {
    const before = slots({ chair: MARIA, member1: JUAN })
    assignFacultyToSlot(before, 'chair', JUAN)
    expect(before).toEqual(slots({ chair: MARIA, member1: JUAN }))
  })

  it('keeps a third member untouched during a swap', () => {
    const result = assignFacultyToSlot(
      slots({ chair: MARIA, member1: JUAN, member2: ANA }),
      'chair',
      JUAN,
    )
    expect(result.member2).toBe(ANA)
  })
})