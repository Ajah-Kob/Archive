// Pure pan geometry for the PDF viewer workspaces.
//
// EmbedPDF's Scroller uses native scroll (`viewport.scrollLeft` / `scrollTop`),
// so a hand tool is a drag that adjusts those two numbers. The scroll viewport
// element is only reachable through `useViewportRef`, and the plugin exposes no
// scrollBy of its own — `ScrollScope.viewport` is private and `scrollToPage` is
// private too.
//
// The arithmetic lives here, away from the pointer handlers, because clamping is
// where the bugs are and it is the only part that can be tested without a device
// or a DOM.

export interface ScrollPoint {
  x: number
  y: number
}

/** The element metrics needed to work out how far the view can move. */
export interface PanBounds {
  scrollWidth: number
  clientWidth: number
  scrollHeight: number
  clientHeight: number
}

/**
 * Furthest the view can scroll on each axis.
 *
 * A document shorter than the viewport gives a negative maximum once you
 * subtract the client size. Browsers clamp a scroll offset to 0 in that case, so
 * this returns 0 rather than a negative number — otherwise every subsequent
 * clamp would be measuring from below the floor and the first drag in the
 * opposite direction would jump.
 */
export function maxPanScroll(bounds: PanBounds): ScrollPoint {
  return {
    x: Math.max(0, bounds.scrollWidth - bounds.clientWidth),
    y: Math.max(0, bounds.scrollHeight - bounds.clientHeight),
  }
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), max)
}

/**
 * Scroll offset after dragging by `delta` pixels from `start`.
 *
 * The delta is subtracted, not added: dragging the pointer down pulls the page
 * down with it, which means revealing content above, which means scrolling up.
 * Getting this backwards is the classic hand-tool bug and it feels like the page
 * is fighting you.
 */
export function panScroll(
  start: ScrollPoint,
  delta: ScrollPoint,
  bounds: PanBounds,
): ScrollPoint {
  const max = maxPanScroll(bounds)
  return {
    x: clamp(start.x - delta.x, max.x),
    y: clamp(start.y - delta.y, max.y),
  }
}