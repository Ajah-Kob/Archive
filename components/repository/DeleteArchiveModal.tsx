'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X, TriangleAlert, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { removeArchive, type RepositoryArchiveRow } from '@/lib/actions/repository'

interface DeleteArchiveModalProps {
  archive: RepositoryArchiveRow | null
  onClose: () => void
}

/**
 * Admin-only confirm modal for removing a repository archive.
 * Follows the SubmitConfirmationModal confirm pattern (portal overlay,
 * focus + Esc handling, red callout, Cancel/confirm footer) and the
 * RemoveTemplateModal null-target controlled pattern. Confirm calls
 * removeArchive (soft-deletes the row + deletes the Blob PDF); the
 * revalidated archives/repository tags make router.refresh() instant.
 */
export function DeleteArchiveModal({ archive, onClose }: DeleteArchiveModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => setMounted(true), [])

  const handleClose = useCallback(() => {
    if (isDeleting) return
    onClose()
  }, [isDeleting, onClose])

  // Focus + Esc + body lock while open (SubmitConfirmationModal precedent).
  useEffect(() => {
    if (!archive || !mounted) return

    const previouslyFocused = globalThis.document.activeElement as HTMLElement | null
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0)

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }

    globalThis.document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = globalThis.document.body.style.overflow
    globalThis.document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(t)
      globalThis.document.removeEventListener('keydown', handleKeyDown)
      globalThis.document.body.style.overflow = prevOverflow
      previouslyFocused?.focus()
    }
  }, [archive, mounted, handleClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) handleClose()
    },
    [handleClose],
  )

  const handleConfirm = useCallback(async () => {
    if (!archive || isDeleting) return
    setIsDeleting(true)
    try {
      const res = await removeArchive(archive.id)
      if (res.success) {
        toast.success(res.message || 'Archive removed.')
        onClose()
        router.refresh()
      } else {
        toast.error(res.message || 'Failed to remove archive. Please try again.')
      }
    } catch {
      toast.error('Failed to remove archive. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }, [archive, isDeleting, onClose, router])

  if (!mounted || !archive) return null

  const content = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      role="presentation"
      style={{ animation: 'backdropIn 300ms ease-out' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-archive-title"
        aria-describedby="delete-archive-desc"
        className="relative bg-white rounded-[14px] shadow-[0_24px_64px_rgba(16,19,58,0.16),0_4px_16px_rgba(0,0,0,0.06)] border border-[#eceef8] w-full max-w-[440px] max-h-[80vh] flex flex-col overflow-hidden"
        style={{ animation: 'modalEnter 350ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-[24px] pt-[20px] pb-[14px] border-b border-[#f0f2fa] shrink-0 bg-white">
          <div className="flex items-start justify-between gap-[16px]">
            <div className="min-w-0">
              <h2
                id="delete-archive-title"
                className="font-heading font-bold text-[16px] leading-[24px] tracking-[-0.16px] text-[#10133a]"
              >
                Delete Archive
              </h2>
              <p
                id="delete-archive-desc"
                className="font-sans font-medium text-[12.5px] leading-[18px] text-[#8a93b4] pt-[2px]"
              >
                This action cannot be undone.
              </p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              aria-label="Close delete confirmation"
              className="size-[30px] rounded-[10px] bg-[#fafbff] border border-[#eceef8] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)]"
            >
              <X className="size-[14px] text-[#8a93b4]" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] py-[20px] flex flex-col gap-[16px]">
          <div>
            <p className="font-heading font-bold text-[11px] uppercase tracking-[0.6px] text-[#9ea8c6] mb-[6px]">
              Research Title
            </p>
            <p className="font-sans font-bold text-[13.5px] leading-[20px] text-[#1e2145] break-words">
              {archive.title}
            </p>
          </div>

          <div
            role="alert"
            className="rounded-[10px] border border-[rgba(225,29,72,0.2)] bg-[rgba(225,29,72,0.07)] px-[14px] py-[10px] flex items-start gap-[10px]"
          >
            <TriangleAlert className="size-[16px] text-[#e11d48] shrink-0 mt-[1px]" strokeWidth={2} />
            <p className="font-sans font-medium text-[12.5px] leading-[18px] text-[#e11d48]">
              This will permanently remove the archive and delete its PDF from storage.
            </p>
          </div>
        </div>

        <div className="border-t border-[#f0f2fa] bg-white px-[24px] py-[16px] shrink-0 flex items-center justify-end gap-[10px]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-semibold text-[13px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            aria-label="Confirm delete archive"
            className="inline-flex items-center justify-center gap-[8px] h-[36px] px-[18px] rounded-[9px] font-heading font-semibold text-[13px] leading-none text-white shadow-[0px_4px_7px_rgba(225,29,72,0.32)] bg-[#e11d48] hover:bg-[#be123c] active:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(225,29,72,0.3)] min-w-[120px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-[14px] animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes modalEnter{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes backdropIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  )

  return createPortal(content, globalThis.document.body)
}

export default DeleteArchiveModal
