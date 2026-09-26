'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Shared dialog behavior for the calendar modals — replaces the copy-pasted
 * Esc/body-lock blocks that previously lived in EventModalFrame and
 * EventDetailsModal.
 *
 * On open: moves focus to `initialFocusRef`, locks body scroll, and traps
 * Tab / Shift+Tab inside the overlay so keyboard users cannot tab into the
 * page behind the dialog. Escape calls `onRequestClose` (callers pass an
 * already-guarded callback so a saving/deleting dialog ignores it).
 * On close: restores scroll and returns focus to whatever opened the dialog.
 */
export function useModalFocus(
  enabled: boolean,
  overlayRef: RefObject<HTMLElement | null>,
  initialFocusRef: RefObject<HTMLElement | null>,
  onRequestClose: () => void,
) {
  useEffect(() => {
    if (!enabled) return

    const doc = globalThis.document
    const previouslyFocused = doc.activeElement as HTMLElement | null
    const focusTimer = setTimeout(() => initialFocusRef.current?.focus(), 0)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onRequestClose()
        return
      }
      if (event.key !== 'Tab') return

      const root = overlayRef.current
      if (!root) return

      // getClientRects() is position-independent — offsetParent is null for
      // anything inside a fixed overlay, which would filter out every node.
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.getClientRects().length > 0)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = doc.activeElement
      const inside = active instanceof Node && root.contains(active)

      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }

    doc.addEventListener('keydown', handleKeyDown)
    const previousOverflow = doc.body.style.overflow
    doc.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(focusTimer)
      doc.removeEventListener('keydown', handleKeyDown)
      doc.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [enabled, overlayRef, initialFocusRef, onRequestClose])
}
