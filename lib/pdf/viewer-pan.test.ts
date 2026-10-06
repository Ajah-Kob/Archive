import { describe, expect, it } from '@jest/globals'
import { maxPanScroll, panScroll, type PanBounds } from '@/lib/pdf/viewer-pan'

/** A viewport 1000x800 of content shown in a 400x300 window. */
const BOUNDS: PanBounds = {
  scrollWidth: 1000,
  clientWidth: 400,
  scrollHeight: 800,
  clientHeight: 300,
}

/** Content smaller than the window, so there is nowhere to pan. */
const NO_ROOM: PanBounds = {
  scrollWidth: 300,
  clientWidth: 400,
  scrollHeight: 200,
  clientHeight: 300,
}

describe('maxPanScroll', () => {
  it('reports how far each axis can move', () => {
    expect(maxPanScroll(BOUNDS)).toEqual({ x: 600, y: 500 })
  })

  it('returns zero, not a negative, when the content is smaller than the window', () => {
    expect(maxPanScroll(NO_ROOM)).toEqual({ x: 0, y: 0 })
  })
})

describe('panScroll', () => {
  it('subtracts the drag so the page follows the pointer', () => {
    // Dragging right/down by 100 moves the viewport back by 100.
    expect(panScroll({ x: 300, y: 300 }, { x: 100, y: 100 }, BOUNDS)).toEqual({
      x: 200,
      y: 200,
    })
  })

  it('clamps at the top-left origin', () => {
    expect(panScroll({ x: 40, y: 40 }, { x: 200, y: 200 }, BOUNDS)).toEqual({
      x: 0,
      y: 0,
    })
  })

  it('clamps at the far end', () => {
    expect(panScroll({ x: 500, y: 400 }, { x: -400, y: -400 }, BOUNDS)).toEqual({
      x: 600,
      y: 500,
    })
  })

  it('stays put when there is nowhere to pan', () => {
    expect(panScroll({ x: 0, y: 0 }, { x: 250, y: 250 }, NO_ROOM)).toEqual({
      x: 0,
      y: 0,
    })
  })

  it('does not go negative when dragged past the origin from a shrunken page', () => {
    // Regression guard for the negative-maximum case: content 100px shorter than
    // the window must still floor at 0 rather than tracking the pointer.
    const shrunken: PanBounds = {
      scrollWidth: 100,
      clientWidth: 400,
      scrollHeight: 100,
      clientHeight: 300,
    }
    const result = panScroll({ x: 0, y: 0 }, { x: 120, y: 120 }, shrunken)
    expect(result).toEqual({ x: 0, y: 0 })
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
  })

  it('ignores a non-finite delta rather than producing NaN scroll', () => {
    const result = panScroll({ x: 100, y: 100 }, { x: NaN, y: NaN }, BOUNDS)
    expect(result).toEqual({ x: 0, y: 0 })
  })

  it('is a pure function of its inputs', () => {
    const start = { x: 100, y: 100 }
    const delta = { x: 40, y: 40 }
    panScroll(start, delta, BOUNDS)
    expect(start).toEqual({ x: 100, y: 100 })
    expect(delta).toEqual({ x: 40, y: 40 })
  })
})