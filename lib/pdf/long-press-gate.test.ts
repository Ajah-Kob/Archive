import { describe, expect, it } from '@jest/globals'
import {
  advance,
  holdElapsed,
  idle,
  kickoffPoint,
  MOVE_TOLERANCE_PX,
  press,
  shouldPreventScroll,
} from './long-press-gate'

const at = (x: number, y: number) => ({ x, y })

describe('long-press gate', () => {
  it('swallows a tap: it never arms and never pans', () => {
    const tapped = press(idle(), at(10, 10))
    expect(tapped.phase).toBe('pending')
    // A tap has no travel, so it neither arms nor turns into a scroll.
    const still = advance(tapped, at(10, 10))
    expect(still.state.phase).toBe('pending')
    expect(still.pan).toBeNull()
    expect(kickoffPoint(tapped)).toBeNull()
  })

  it('turns a flick into a pan and suppresses native scroll', () => {
    const pending = press(idle(), at(100, 100))
    const { state, pan } = advance(pending, at(100, 160))
    expect(state.phase).toBe('panning')
    expect(shouldPreventScroll(state)).toBe(true)
    expect(pan).toEqual({ x: 0, y: 60 })
    // A pan must never arm the annotation layer.
    expect(holdElapsed(state).phase).toBe('panning')
  })

  it('tolerates jitter below the threshold without falling into a pan', () => {
    const pending = press(idle(), at(100, 100))
    const jittered = advance(pending, at(100 + MOVE_TOLERANCE_PX, 100))
    expect(jittered.state.phase).toBe('pending')
    expect(jittered.pan).toBeNull()
    expect(kickoffPoint(holdElapsed(jittered.state))).toEqual(at(100, 100))
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
    const dragged = advance(armed, at(400, 400))
    expect(dragged.state.phase).toBe('armed')
    expect(dragged.pan).toBeNull()
    expect(kickoffPoint(dragged.state)).toEqual(at(10, 10))
  })

  it('reports incremental travel so the viewport tracks the finger', () => {
    // First move: pending becomes panning, and this step carries the whole
    // travel from where the finger went down.
    const first = advance(press(idle(), at(0, 0)), at(30, 50))
    expect(first.state.phase).toBe('panning')
    expect(first.pan).toEqual({ x: 30, y: 50 })

    // After that it is incremental, and no travel is dropped between steps.
    const second = advance(first.state, at(35, 70))
    expect(second.pan).toEqual({ x: 5, y: 20 })
    expect(advance(second.state, at(40, 70)).pan).toEqual({ x: 5, y: 0 })
  })

  it('carries the touch identifier through to the kickoff event', () => {
    expect(press(idle(), at(0, 0), 7).pointerId).toBe(7)
    expect(idle().pointerId).toBeNull()
  })

  it('ignores moves when no finger is down', () => {
    expect(advance(idle(), at(50, 50)).pan).toBeNull()
    expect(advance(idle(), at(50, 50)).state.phase).toBe('idle')
  })
})