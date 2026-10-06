import { describe, expect, it } from '@jest/globals'
import {
  holdElapsed,
  idle,
  kickoffPoint,
  MOVE_TOLERANCE_PX,
  move,
  press,
  shouldPreventScroll,
} from './long-press-gate'

const at = (x: number, y: number) => ({ x, y })

describe('long-press gate', () => {
  it('swallows the tap and never lets it through', () => {
    const held = holdElapsed(press(idle(), at(10, 10)))
    // A tap is a press immediately followed by release: no hold ever elapses.
    expect(kickoffPoint(press(idle(), at(10, 10)))).toBeNull()
    expect(held.phase).toBe('armed')
    expect(idle()).toEqual(idle())
  })

  it('cancels the hold when the finger moves, so a flick scrolls', () => {
    const pending = press(idle(), at(100, 100))
    expect(move(pending, at(100 + MOVE_TOLERANCE_PX + 1, 100))).toEqual(idle())
    expect(shouldPreventScroll(move(pending, at(200, 100)))).toBe(false)
  })

  it('tolerates jitter below the threshold without cancelling', () => {
    const pending = press(idle(), at(100, 100))
    const jittered = move(pending, at(100 + MOVE_TOLERANCE_PX, 100))
    expect(jittered.phase).toBe('pending')
    expect(kickoffPoint(holdElapsed(jittered))).toEqual(at(100, 100))
  })

  it('arms on hold and suppresses scroll only once armed', () => {
    const pending = press(idle(), at(50, 60))
    expect(shouldPreventScroll(pending)).toBe(false)
    const armed = holdElapsed(pending)
    expect(armed.phase).toBe('armed')
    expect(shouldPreventScroll(armed)).toBe(true)
    expect(kickoffPoint(armed)).toEqual(at(50, 60))
  })

  it('ignores a hold that did not start with a press', () => {
    expect(holdElapsed(idle()).phase).toBe('idle')
    expect(kickoffPoint(holdElapsed(idle()))).toBeNull()
  })

  it('keeps arming through the drag that follows the hold', () => {
    const armed = holdElapsed(press(idle(), at(10, 10)))
    // The selection drag must not re-cancel or reset the gate.
    expect(move(armed, at(400, 400)).phase).toBe('armed')
    expect(kickoffPoint(move(armed, at(400, 400)))).toEqual(at(10, 10))
  })
})