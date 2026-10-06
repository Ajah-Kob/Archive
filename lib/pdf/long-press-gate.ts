/**
 * Long-press gate for touch gestures over the PDF page.
 *
 * On touch the gate owns the gesture outright, because neither outcome is
 * available by default: EmbedPDF's annotation layers set `touch-action: none`
 * (so the browser refuses to scroll), while a bare tap or flick must never
 * create an annotation. A tap does nothing, a flick pans, a 400ms hold hands
 * over to the annotation layer.
 *
 * This is a plain state machine so that three-way decision is testable
 * without a browser.
 *
 * ponytail: the gate pans by writing the viewport's scroll offsets rather than
 * reaching for a scroll API, because `ScrollScope.viewport` and `scrollToPage`
 * are both private in the plugin. The clamping arithmetic is reused from
 * `viewer-pan.ts` so the hand tool and this agree on the limits.
 */

export const LONG_PRESS_MS = 400

/** Movement past this before the hold completes means "scroll", not "hold". */
export const MOVE_TOLERANCE_PX = 10

export interface Point {
  x: number
  y: number
}

/**
 * `pending` — finger is down and still; a hold may still arm.
 * `panning`  — the finger moved first, so this is a scroll.
 * `armed`    — the hold won; the annotation layer owns the rest of the gesture.
 */
export type Phase = 'idle' | 'pending' | 'panning' | 'armed'

export interface GateState {
  phase: Phase
  origin: Point | null
  /** Finger position already accounted for, so panning stays incremental. */
  last: Point | null
  /** Touch identifier, reused as the pointerId of the kickoff event. */
  pointerId: number | null
}

/** One step of the gesture: the new state, and any pan to apply with it. */
export interface GateUpdate {
  state: GateState
  pan: Point | null
}

export function idle(): GateState {
  return { phase: 'idle', origin: null, last: null, pointerId: null }
}

/** Finger went down: swallow the event and start the hold timer. */
export function press(state: GateState, point: Point, pointerId = 1): GateState {
  return { phase: 'pending', origin: point, last: point, pointerId }
}

/**
 * Movement before the hold completes makes it a scroll. Movement after arming
 * is the user's selection drag, which must change nothing.
 *
 * Returns any pan the caller should apply in the same step. `last` is only
 * advanced when a pan is reported, so the delta is never lost between the
 * move and the scroll it asked for.
 */
export function advance(state: GateState, point: Point): GateUpdate {
  if (state.phase === 'idle') return { state, pan: null }

  if (state.phase === 'armed') {
    // The annotation layer owns the drag; we only hold scroll off.
    return { state: { ...state, last: point }, pan: null }
  }

  if (state.phase === 'pending') {
    const origin = state.origin
    if (!origin) return { state, pan: null }
    if (Math.hypot(point.x - origin.x, point.y - origin.y) <= MOVE_TOLERANCE_PX) {
      return { state, pan: null }
    }
    // Moved before the hold completed: this is a scroll. The first pan step
    // carries the whole travel from where the finger went down, so the page
    // tracks the finger instead of lagging a frame behind it.
    const panning: GateState = { ...state, phase: 'panning', last: point }
    return { state: panning, pan: { x: point.x - origin.x, y: point.y - origin.y } }
  }

  const last = state.last ?? point
  return {
    state: { ...state, last: point },
    pan: { x: point.x - last.x, y: point.y - last.y },
  }
}

/** The hold completed without moving: the gesture now belongs to the plugin. */
export function holdElapsed(state: GateState): GateState {
  if (state.phase !== 'pending') return state
  return { ...state, phase: 'armed' }
}

/**
 * Suppress native scrolling whenever the gate owns the gesture: while panning
 * (we scroll the viewport ourselves) and while armed (the selection drag must
 * not be stolen by the browser).
 */
export function shouldPreventScroll(state: GateState): boolean {
  return state.phase === 'panning' || state.phase === 'armed'
}

/**
 * Where to synthesise the kickoff `pointerdown`. The swallowed one never
 * reached the plugin, and it only begins a selection if it was enabled at
 * pointerdown — so the gesture has to be re-stated to start the drag.
 */
export function kickoffPoint(state: GateState): Point | null {
  return state.phase === 'armed' ? state.origin : null
}