/**
 * Long-press gate for touch annotation gestures.
 *
 * On touch, a bare tap or a flick-drag must never create an annotation:
 * a flick is a scroll. So the first `LONG_PRESS_MS` of any touch that starts
 * on empty page space is swallowed, and the gesture is only handed to the
 * annotation layer once the finger has stayed put long enough.
 *
 * This is a plain state machine so the three-way decision (scroll vs. select
 * vs. place) is testable without a browser.
 *
 * ponytail: the swallow is an overlay, not an `enableSelection` toggle. The
 * selection plugin only accepts a gesture that is already enabled at
 * pointerdown, so a config flag flipped mid-touch is ignored — the overlay
 * stays up instead and the gesture is synthesised once the hold completes.
 */

export const LONG_PRESS_MS = 400

/** Movement past this before the hold completes means "scroll", not "hold". */
export const MOVE_TOLERANCE_PX = 10

export interface Point {
  x: number
  y: number
}

export type Phase = 'idle' | 'pending' | 'armed'

export interface GateState {
  phase: Phase
  origin: Point | null
}

export function idle(): GateState {
  return { phase: 'idle', origin: null }
}

/** Touch went down on gated space: swallow it and start the hold timer. */
export function press(state: GateState, point: Point): GateState {
  return { phase: 'pending', origin: point }
}

/**
 * Movement before the hold completes abandons it — that is a scroll, and the
 * browser is left to do it. Movement after arming is the user's selection
 * drag and must not cancel anything.
 */
export function move(state: GateState, point: Point): GateState {
  if (state.phase !== 'pending' || !state.origin) return state
  const dx = point.x - state.origin.x
  const dy = point.y - state.origin.y
  return Math.hypot(dx, dy) > MOVE_TOLERANCE_PX ? idle() : state
}

/** The hold completed without moving: the gesture now belongs to the plugin. */
export function holdElapsed(state: GateState): GateState {
  if (state.phase !== 'pending') return state
  return { phase: 'armed', origin: state.origin }
}

/** Only suppress native scrolling once the gesture is ours. */
export function shouldPreventScroll(state: GateState): boolean {
  return state.phase === 'armed'
}

/**
 * Where to synthesise the kickoff `pointerdown`. The swallowed one never
 * reached the plugin, and it only begins a selection if it was enabled at
 * pointerdown — so the gesture has to be re-stated to start the drag.
 */
export function kickoffPoint(state: GateState): Point | null {
  return state.phase === 'armed' ? state.origin : null
}