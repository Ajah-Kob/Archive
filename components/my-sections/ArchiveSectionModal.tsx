'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Archive, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { archiveSection, type MySectionCardData } from '@/lib/actions/sections'

type SectionRef = Pick<MySectionCardData, 'id' | 'name'>

interface ArchiveSectionModalProps {
  section: SectionRef | null
  onClose: () => void
  onSuccess: () => void
}

const ARCHIVE_FAILURE_MESSAGE = 'Failed to archive section.'

export function ArchiveSectionModal({
  section,
  onClose,
  onSuccess,
}: ArchiveSectionModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  // The portal cannot render during SSR; this one-time hydration flag is the
  // established modal pattern in this repository.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  const handleClose = useCallback(() => {
    if (isPending) return
    onClose()
  }, [isPending, onClose])

  useEffect(() => {
    if (!mounted || !section) return

    const previouslyFocused =
      globalThis.document.activeElement instanceof HTMLElement
        ? globalThis.document.activeElement
        : null
    const focusTimer = globalThis.setTimeout(
      () => closeButtonRef.current?.focus(),
      0,
    )

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      handleClose()
    }

    globalThis.document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = globalThis.document.body.style.overflow
    globalThis.document.body.style.overflow = 'hidden'

    return () => {
      globalThis.clearTimeout(focusTimer)
      globalThis.document.removeEventListener('keydown', handleKeyDown)
      globalThis.document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [handleClose, mounted, section])

  const handleOverlayClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === overlayRef.current) handleClose()
    },
    [handleClose],
  )

  const handleConfirm = useCallback(async () => {
    if (!section || isPending) return

    setIsPending(true)
    setSubmitError(null)

    try {
      const result = await archiveSection(section.id)
      if (result.success) {
        toast.success(result.message)
        setIsPending(false)
        onSuccess()
        onClose()
        return
      }

      setSubmitError(result.message)
      toast.error(result.message)
    } catch {
      setSubmitError(ARCHIVE_FAILURE_MESSAGE)
      toast.error(ARCHIVE_FAILURE_MESSAGE)
    } finally {
      setIsPending(false)
    }
  }, [isPending, onClose, onSuccess, section])

  if (!mounted || !section) return null

  return createPortal(
    <div
      ref={overlayRef}
      role="presentation"
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,18,40,0.45)] backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-section-title"
        aria-describedby="archive-section-description"
        aria-busy={isPending}
        className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={handleClose}
          disabled={isPending}
          aria-label="Close archive section dialog"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#f3f4f6] text-[#4b5563]">
            <Archive size={24} aria-hidden="true" />
          </div>
          <div>
            <h3
              id="archive-section-title"
              className="text-lg font-bold text-slate-900"
            >
              Archive Section
            </h3>
            <p
              id="archive-section-description"
              className="text-xs text-slate-500 mt-1 max-w-xs"
            >
              Are you sure you want to archive section &quot;{section.name}&quot;?
              It will be hidden from active lists and its name will become
              available for reuse. Only empty sections can be archived.
            </p>
          </div>
        </div>

        {submitError ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 py-2 text-center font-sans font-medium text-[12px] leading-[18px] text-[#4b5563]"
          >
            {submitError}
          </p>
        ) : null}

        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            aria-label="Archive section"
            className="inline-flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-sm active:scale-95 bg-[#4b5563] hover:bg-[#374151] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Archiving…
              </>
            ) : (
              'Archive'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
