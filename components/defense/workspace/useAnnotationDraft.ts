'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import type { AnnotationTransferItem } from '@embedpdf/plugin-annotation'
import { deserializeAnnotations } from '@/lib/annotations-serializer'
import { fingerprintAnnotations } from '@/components/defense/workspace/review-annotations'

/**
 * Removes duplicate annotation items by id, keeping the FIRST occurrence.
 * The annotation reducer is NOT idempotent — re-importing an annotation that
 * is already in the store pushes the same uid into `pages` again, which makes
 * AnnotationLayer render duplicate children (React key collision). Duplicates
 * can also be persisted by a previous auto-save, so both the hydration path
 * and the save path must dedupe.
 */
function dedupeAnnotations(
  items: AnnotationTransferItem[],
  alreadyInStore?: Set<string>,
): AnnotationTransferItem[] {
  const seen = new Set<string>()
  const out: AnnotationTransferItem[] = []
  for (const item of items) {
    const id = (item.annotation as { id?: string } | null)?.id
    if (!id) {
      out.push(item)
      continue
    }
    if (alreadyInStore?.has(id)) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(item)
  }
  return out
}

export interface UseAnnotationDraftOptions {
  documentId: string
  /** Serialized AnnotationTransferItem[] from getSubmissionAnnotations, or null. */
  initialAnnotations: AnnotationTransferItem[] | null
  /**
   * Annotation ids to exclude from change detection — e.g. freshly created
   * highlight/strikeout annotations whose comment has not been submitted yet.
   * Pending annotations are never persisted until the user saves a comment, so
   * they must not count as changes either: a bare highlight must not enable a
   * Save that would persist nothing.
   */
  excludeIdsRef?: RefObject<Set<string>>
  /**
   * When false (student read-only mode) change tracking is disabled.
   * Hydration still runs — saved reviewer annotations must render for the
   * student too.
   */
  enabled?: boolean
}

/** Fingerprint of the server-supplied annotations — i.e. the last saved state. */
function savedStateFingerprint(items: AnnotationTransferItem[] | null | undefined): string {
  return fingerprintAnnotations(
    ((items ?? []) as unknown as { annotation?: Record<string, unknown> }[])
      .map((i) => i.annotation)
      .filter((a): a is Record<string, unknown> => !!a),
  )
}

/**
 * Hydration plus change tracking for the adviser review workspace.
 *
 * Saved annotations are hydrated back into the viewer on mount via
 * importAnnotations, and committed annotation events (create/update/delete)
 * recompute a fingerprint of the current state for comparison against the last
 * saved state. Nothing here writes to the database: annotations persist only
 * through the explicit Save flow (the toolbar Save button, Save-and-leave,
 * Discard-and-leave), which export and call saveDefenseAnnotationDraft
 * directly.
 *
 * Must be rendered inside the EmbedPDF tree (uses useAnnotation).
 */
export function useAnnotationDraft({
  documentId,
  initialAnnotations,
  excludeIdsRef,
  enabled = true,
}: UseAnnotationDraftOptions): {
  /**
   * True when the CURRENT annotation state differs from the LAST SAVED state.
   *
   * A state comparison, not an event flag. That distinction is the whole point:
   * an event flag reports a change for a delete-and-restore round trip and
   * misses nothing else, whereas the requirement is "current ≠ last saved".
   * Comparing states is what makes deleting the LAST annotation count as a
   * change — the current set is then empty, which differs from the saved set —
   * and what makes an edit that is undone stop counting.
   *
   * The baseline is the server-supplied initialAnnotations, i.e. what was last
   * persisted, and markClean() moves it forward to the current state after a
   * save. Both sides run through the same fingerprint so incidental shape
   * differences between stored and live annotation objects cannot register.
   */
  isDirty: boolean
  /** Call after a successful save to make the document clean again. */
  markClean: () => void
} {
  const { provides } = useAnnotation(documentId)

  // useAnnotation rebuilds the per-document scope on every render, so keep the
  // latest scope in a ref and gate effects on stable signals — depending on the
  // scope object directly would resubscribe on every render.
  const providesRef = useRef(provides)
  providesRef.current = provides

  const [ready, setReady] = useState(false)

  const hydratedRef = useRef(false)
  const importedIdsRef = useRef<Set<string>>(new Set())
  // Fingerprint of the last saved state, and of the current state. Kept as state
  // rather than refs because isDirty is read during render, and reading a ref
  // there is exactly what react-hooks/refs flags. A document is clean on open
  // because the store is about to hold exactly what the server sent.
  const [baselinePrint, setBaselinePrint] = useState<string>(() =>
    savedStateFingerprint(initialAnnotations),
  )
  const [currentPrint, setCurrentPrint] = useState<string | null>(null)

  const computeCurrent = useCallback((): string | null => {
    const scope = providesRef.current
    if (!scope) return null
    try {
      const state = scope.getState() as unknown as {
        byUid?: Record<string, { object?: Record<string, unknown> }>
      }
      const objects: Record<string, unknown>[] = []
      for (const tracked of Object.values(state.byUid ?? {})) {
        if (tracked?.object) objects.push(tracked.object)
      }
      return fingerprintAnnotations(objects, excludeIdsRef?.current)
    } catch {
      return null
    }
  }, [excludeIdsRef])

  const isDirty = currentPrint !== null && currentPrint !== baselinePrint

  const markClean = useCallback(() => {
    // After a save the current state IS the last saved state. If nothing had
    // changed there is nothing to move the baseline forward to, so keep it.
    setBaselinePrint((prev) => (currentPrint === null ? prev : currentPrint))
    setCurrentPrint(null)
  }, [currentPrint])

  // Reset per-document state when the active document changes.
  useEffect(() => {
    hydratedRef.current = false
    importedIdsRef.current.clear()
    setCurrentPrint(null)
    setBaselinePrint(savedStateFingerprint(initialAnnotations))
  }, [documentId, initialAnnotations])

  // Flip `ready` once the annotation scope becomes available. The scope object
  // is recreated each render, so this effect runs often but only sets state once.
  useEffect(() => {
    if (provides && !ready) setReady(true)
  }, [provides, ready])

  // Hydrate saved annotations AFTER the engine's initial annotation load
  // completes (the `loaded` event). The engine may already have loaded
  // annotations (e.g. a document re-opened in the same session) — importing
  // them again would push the same uids into `pages` a second time (the
  // reducer is NOT idempotent). So we wait for `loaded`, then import only
  // annotations that are NOT already in the store.
  //
  // Runs in BOTH modes: hydration is a read — students need the reviewer's
  // committed annotations rendered just as much as the adviser does. Only the
  // change-tracking subscription below is gated by `enabled`.
  useEffect(() => {
    if (!provides || hydratedRef.current) return

    const hydrate = () => {
      hydratedRef.current = true
      if (initialAnnotations && initialAnnotations.length > 0) {
        const items = deserializeAnnotations(initialAnnotations)
        // Read the CURRENT store state (the engine load may have populated
        // byUid since this effect's closure was created).
        const currentState = provides.getState()
        const existingIds = new Set(Object.keys(currentState.byUid))
        // The serializer's structural AnnotationTransferItem (annotation:
        // unknown) is not assignable to the plugin's typed item — the data is
        // faithfully round-tripped, so bridge the types explicitly.
        const fresh = dedupeAnnotations(
          items as unknown as AnnotationTransferItem[],
          existingIds,
        )
        for (const item of fresh) {
          const id = (item.annotation as { id?: string } | null)?.id
          if (id) importedIdsRef.current.add(id)
        }
        if (fresh.length > 0) {
          provides.importAnnotations(fresh)
        }
      }
    }

    const unsubscribe = provides.onAnnotationEvent((event) => {
      if (event.type !== 'loaded') return
      if (typeof unsubscribe === 'function') unsubscribe()
      hydrate()
    })

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [provides, initialAnnotations, documentId])

  // Change tracking only. This effect used to also debounce an auto-save that
  // wrote a DRAFT ~1.5s after every change; that is gone on purpose. Annotations
  // persist solely through the explicit Save flow (toolbar Save, Save-and-leave,
  // Discard-and-leave), which export and call saveDefenseAnnotationDraft
  // directly. Crash or kill before an explicit save loses the work in flight —
  // that is the accepted cost of explicit-save semantics, not an oversight.
  useEffect(() => {
    if (!enabled || !ready) return
    const scope = providesRef.current
    if (!scope) return

    const unsub = scope.onAnnotationEvent((event) => {
      if (event.type === 'loaded') return
      if (!event.committed) return
      // The initial import commits the saved annotations to the engine, which
      // re-emits committed `create` events for them. Those match the baseline
      // by construction, so recomputing on them is a harmless no-op rather
      // than a false dirty — but skip them anyway to avoid pointless renders.
      if (event.type === 'create' && importedIdsRef.current.has(event.annotation.id)) return

      // Recompute from the store rather than raising a flag. Only committed
      // events reach here, so a mid-drag preview never flickers the Save button;
      // the drop emits a committed event, and because the comparison is against
      // the saved state a drag that ends where it started leaves Save disabled.
      setCurrentPrint(computeCurrent())
    })

    return () => {
      unsub()
    }
  }, [enabled, ready, documentId, computeCurrent])

  return {
    isDirty,
    markClean,
  }
}
