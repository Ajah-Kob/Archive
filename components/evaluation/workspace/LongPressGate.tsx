'use client'

import { useEffect, useRef, useState } from 'react'
import { useIsTouchViewport } from '@/lib/hooks/useMediaQuery'
import {
  advance,
  holdElapsed,
  idle,
  kickoffPoint,
  LONG_PRESS_MS,
  press,
  shouldPreventScroll,
  type GateState,
  type Point,
} from '@/lib/pdf/long-press-gate'

interface LongPressGateProps {
  /** Whether a completed hold hands over to the annotation layer. */
  active: boolean
  /** Fired once the hold completes, with where the gesture started. */
  onArm: (point: Point, pointerId: number) => void
  className?: string
}

/**
 * Touch gate over the PDF page: owns every touch gesture and picks its outcome.
 *
 * It exists because neither outcome is available on its own. EmbedPDF's
 * annotation layers set `touch-action: none`, so the browser refuses to scroll
 * the page on touch; and without a gate a bare tap or flick creates an
 * annotation. So the gate swallows the gesture and decides:
 *
 *   tap            -> nothing
 *   flick          -> pans the viewport (clamped, same maths as the hand tool)
 *   hold 400ms     -> hands over to the annotation layer
 *
 * The hold re-states the gesture, because the plugin only begins on a
 * pointerdown it saw and the one the gate swallowed never reached it.
 *
 * Renders nothing on desktop, where the hand tool and normal mouse behaviour
 * already cover this.
 */
export function LongPressGate({ active, onArm, className }: LongPressGateProps) {
  const isTouchViewport = useIsTouchViewport()
  const stateRef = useRef<GateState>(idle())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [armed, setArmed] = useState(false)

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  // The overlay is inert once armed, so the rest of the gesture is tracked on
  // the window. Native scrolling has to be held off for the whole of it, or
  // the browser pans underneath the selection drag.
  useEffect(() => {
    if (!armed) return
    function blockScroll(e: TouchEvent) {
      if (shouldPreventScroll(stateRef.current)) e.preventDefault()
    }
    function finish() {
      stateRef.current = idle()
      setArmed(false)
    }
    window.addEventListener('touchmove', blockScroll, { passive: false })
    window.addEventListener('touchend', finish)
    window.addEventListener('touchcancel', finish)
    return () => {
      window.removeEventListener('touchmove', blockScroll)
      window.removeEventListener('touchend', finish)
      window.removeEventListener('touchcancel', finish)
    }
  }, [armed])

  // Switching tool or leaving review abandons an in-flight hold. Only state is
  // touched here; the timer and gesture ref are reset in the effect below,
  // since neither is safe to reach during render.
  const [lastActive, setLastActive] = useState(active)
  if (lastActive !== active) {
    setLastActive(active)
    if (!active) setArmed(false)
  }

  // The hold timer and gesture ref are external to React, so they are reset
  // here rather than during render.
  useEffect(() => {
    if (!active) {
      clearTimer()
      stateRef.current = idle()
    }
  }, [active])

  useEffect(() => clearTimer, [])

  function pointFrom(e: React.TouchEvent): { point: Point; pointerId: number } {
    const t = e.changedTouches[0] ?? e.touches[0]
    return {
      point: { x: t?.clientX ?? 0, y: t?.clientY ?? 0 },
      pointerId: t?.identifier ?? 1,
    }
  }


  function handleTouchStart(e: React.TouchEvent) {
    // Moving or deleting an existing annotation should not need a hold.
    if ((e.target as HTMLElement).closest('[data-annotation-drag]')) return
    const { point, pointerId } = pointFrom(e)
    stateRef.current = press(stateRef.current, point, pointerId)
    clearTimer()
    if (!active) return
    timerRef.current = setTimeout(() => {
      const next = holdElapsed(stateRef.current)
      stateRef.current = next
      const origin = kickoffPoint(next)
      if (!origin) return
      setArmed(true)
      onArm(origin, next.pointerId ?? 1)
    }, LONG_PRESS_MS)
  }

function handleTouchMove(e: React.TouchEvent) {
    // Scrolling is no longer ours to handle — EmbedPDF's Pan plugin owns it and
    // is the default mode on touch. This gesture is only ever heading for an
    // annotation, so there is nothing to pan here.
    const { state } = advance(stateRef.current, pointFrom(e).point)
    stateRef.current = state
    if (shouldPreventScroll(state)) e.preventDefault()
  }

  function handleTouchEnd() {
    clearTimer()
    stateRef.current = idle()
    setArmed(false)
  }

  if (!isTouchViewport) return null

  return (
    <div
      aria-hidden="true"
      data-long-press-gate=""
      className={className}
      style={{ pointerEvents: armed ? 'none' : 'auto', touchAction: 'pan-x pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    />
  )
}