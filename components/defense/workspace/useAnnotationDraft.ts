'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import type { AnnotationTransferItem } from '@embedpdf/plugin-annotation'
import { deserializeAnnotations, serializeAnnotations } from '@/lib/annotations-serializer'
import { saveDefenseAnnotationDraft } from '@/lib/actions/defense-annotations'
import {
  isReviewAnnotation,
  fingerprintAnnotations,
} from '@/components/defense/workspace/review-annotations'

/** Debounce window after the last committed annotation change (ms). */
const DEBOUNCE_MS = 1500

export type AnnotationDraftStatus = 'saving' | 'saved' | 'idle'

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
  submissionId: number
  documentId: string
  /** Serialized AnnotationTransferItem[] from getSubmissionAnnotations, or null. */
  initialAnnotations: AnnotationTransferItem[] | null
  /**
   * Annotation ids to exclude from auto-save — e.g. freshly created
   * highlight/strikeout annotations whose comment has not been submitted yet.
   * Pending annotations are never persisted until the user saves a comment.
   */
  excludeIdsRef?: RefObject<Set<string>>
  /**
   * When false (student read-only mode) only auto-save is disabled. Hydration
   * still runs — saved reviewer annotations must render for the student too.
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
 * Debounced auto-save for the adviser review workspace.
 *
 * Subscribes to committed annotation events (create/update/delete) and, ~1.5s
 * after the last change, exports the annotations, base64-serializes stamp
 * data, and upserts them as a DRAFT via saveAnnotationDraft. Saved annotations
 * are hydrated back into the viewer on mount via importAnnotations.
 *
 * Must be rendered inside the EmbedPDF tree (uses useAnnotation).
 */
export function useAnnotationDraft({
  submissionId,
  documentId,
  initialAnnotations,
  excludeIdsRef,
  enabled = true,
}: UseAnnotationDraftOptions): {
  status: AnnotationDraftStatus
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
  // scope object directly would tear down the debounce timer on every render.
  const providesRef = useRef(provides)
  providesRef.current = provides

  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<AnnotationDraftStatus>('idle')

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    setStatus('idle')
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
  // committed annotations rendered just as much as the adviser does. Only
  // auto-save (below) is gated by `enabled`.
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

  // Debounced auto-save: exportAnnotations → serializeAnnotations → saveAnnotationDraft.
  useEffect(() => {
    if (!enabled || !ready) return
    const scope = providesRef.current
    if (!scope) return

    const flushSave = () => {
      setStatus('saving')
      scope.exportAnnotations().wait(
        (items) => {
          // Nothing to persist — skip the server call entirely.
          if (items.length === 0) {
            setStatus('idle')
            return
          }
          // Native document annotations (hyperlinks are /Link annotations,
          // Word exports add squares/lines…) live in the same store but are
          // NOT reviewer feedback — persisting them would make a first-time
          // submission "contain comments". Keep only the review tools.
          const reviewItems = items.filter((item) =>
            isReviewAnnotation(item.annotation),
          )
          if (reviewItems.length === 0) {
            setStatus('idle')
            return
          }
          // Dedupe before persisting so a store that accumulated duplicates
          // (e.g. from a hot-reload remount) heals itself on the next save.
          const unique = dedupeAnnotations(reviewItems)
          if (unique.length === 0) {
            setStatus('idle')
            return
          }
          // Drop pending annotations (freshly created, no comment yet) so an
          // empty highlight is never persisted. They are included only after a
          // comment is saved (removed from the exclude set) or removed entirely
          // when canceled (deleted from the store).
          const excluded = excludeIdsRef?.current
          const filtered =
            excluded && excluded.size > 0
              ? unique.filter((item) => {
                  const id = (item.annotation as { id?: string } | null)?.id
                  return !id || !excluded.has(id)
                })
              : unique
          if (filtered.length === 0) {
            setStatus('idle')
            return
          }
          const data = serializeAnnotations(filtered)
          void saveDefenseAnnotationDraft(submissionId, data)
            .then((result) => setStatus(result.success ? 'saved' : 'idle'))
            .catch(() => setStatus('idle'))
        },
        (error) => {
          console.error('[useAnnotationDraft] exportAnnotations failed:', error)
          setStatus('idle')
        },
      )
    }

    const unsub = scope.onAnnotationEvent((event) => {
      if (event.type === 'loaded') return
      if (!event.committed) return
      // The initial import commits the saved annotations to the engine, which
      // re-emits committed `create` events for them. Those are already
      // persisted — re-saving would flip a COMMITTED row back to DRAFT.
      if (event.type === 'create' && importedIdsRef.current.has(event.annotation.id)) return

      // Recompute from the store rather than raising a flag. Only committed
      // events reach here, so a mid-drag preview never flickers the Save button;
      // the drop emits a committed event, and because the comparison is against
      // the saved state a drag that ends where it started leaves Save disabled.
      setCurrentPrint(computeCurrent())

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(flushSave, DEBOUNCE_MS)
    })

    return () => {
      unsub()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled, ready, documentId, submissionId, computeCurrent])

  return {
    status,
    isDirty,
    markClean,
  }
}
