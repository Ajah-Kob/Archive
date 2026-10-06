'use client'

import { useEffect, useRef, useState } from 'react'
import {
  holdElapsed,
  idle,
  kickoffPoint,
  LONG_PRESS_MS,
  move,
  press,
  shouldPreventScroll,
  type GateState,
  type Point,
} from '@/lib/pdf/long-press-gate'

interface LongPressGateProps {
  /** True while an annotation tool is armed. Renders nothing when false. */
  active: boolean
  /** Fired once the hold completes, with the point the gesture started at. */
  onArm: (point: Point) => void
  className?: string
}

/**
 * Touch-only gate that stops an annotation being created by a stray tap.
 *
 * The overlay sits over the page while an annotation tool is armed. It does
 * NOT block scrolling — `touch-action: pan-x pan-y` leaves panning to the
 * browser, so a flick still scrolls and still passes through this element. It
 * only swallows the touch event itself, which is what would have started a
 * selection or placed an annotation.
 *
 * After `LONG_PRESS_MS` unmoved the gate stands down and reports the origin
 * point, so the caller can re-state the gesture to the annotation layer. From
 * then on the gesture is the user's: drag to select, release to place.
 *
 * Touches that begin on an annotation are left alone — moving or deleting an
 * existing annotation must not require a hold.
 *
 * Renders nothing on the server and nothing when `active` is false.
 */
export function LongPressGate({ active, onArm, className }: LongPressGateProps) {
  const stateRef = useRef<GateState>(idle())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [armed, setArmed] = useState(false)

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  // Once armed this element is inert, so the rest of the gesture is tracked on
  // the window: the browser must not pan underneath the user's selection drag.
  useEffect(() => {
    if (!armed) return
    function blockScroll(e: TouchEvent) {
      if (shouldPreventScroll(stateRef.current)) e.preventDefault()
    }
    function end() {
      // Touch ended either way — the gate resets for the next gesture.
      stateRef.current = idle()
      setArmed(false)
    }
    window.addEventListener('touchmove', blockScroll, { passive: false })
    window.addEventListener('touchend', end)
    window.addEventListener('touchcancel', end)
    return () => {
      window.removeEventListener('touchmove', blockScroll)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', end)
    }
  }, [armed])

  // Switching tool or leaving review abandons an in-flight hold. The state is
  // adjusted during render (React's "reset state when a prop changes" pattern);
  // touching the timer ref there would not be render-safe.
  const [lastActive, setLastActive] = useState(active)
  if (lastActive !== active) {
    setLastActive(active)
    if (!active) setArmed(false)
  }

  // The hold timer is an external system, so cancelling it belongs in an effect.
  useEffect(() => {
    if (!active) {
      clearTimer()
      stateRef.current = idle()
    }
  }, [active])

  useEffect(() => clearTimer, [])

  function pointFrom(e: React.TouchEvent): Point {
    const t = e.changedTouches[0] ?? e.touches[0]
    return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 }
  }

  function handleTouchStart(e: React.TouchEvent) {
    if ((e.target as HTMLElement).closest('[data-annotation-drag]')) return
    stateRef.current = press(stateRef.current, pointFrom(e))
    clearTimer()
    timerRef.current = setTimeout(() => {
      const next = holdElapsed(stateRef.current)
      stateRef.current = next
      const origin = kickoffPoint(next)
      if (!origin) return
      setArmed(true)
      onArm(origin)
    }, LONG_PRESS_MS)
  }

  function handleTouchMove(e: React.TouchEvent) {
    const next = move(stateRef.current, pointFrom(e))
    stateRef.current = next
    if (shouldPreventScroll(next)) e.preventDefault()
  }

  function handleTouchEnd() {
    clearTimer()
    stateRef.current = idle()
    setArmed(false)
  }

  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ pointerEvents: armed ? 'none' : 'auto', touchAction: 'pan-x pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    />
  )
}