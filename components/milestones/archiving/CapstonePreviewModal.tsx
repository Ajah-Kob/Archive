'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Star, Eye, ExternalLink, X, FileText } from 'lucide-react'
import type { AuthorEntry } from '@/lib/archiving/validation'
import type { UploadDocumentValue } from './fields/UploadDocument'

// ─────────────────────────────────────────────────────────────
// Pure formatting helpers — no side effects, testable, reusable
// Used by Repository as well; keep in sync with ChairReviewTable formatAuthorsShort
// ─────────────────────────────────────────────────────────────

/** Returns initials for a firstName: "John" → "J.", "John Michael" → "J.M." */
export function formatAuthorInitials(firstName: string): string {
  const parts = (firstName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return ''
  return parts.map((p) => `${p[0]!.toUpperCase()}.`).join('')
}

/**
 * Formats ordered authors for the Repository preview line.
 * Lastname, FirstInitial. + second initial if firstname has 2 words, join " · "
 * e.g. [{lastName:'Gutierrez', firstName:'Aaron James'}] → "Gutierrez, A.J."
 * e.g. [{lastName:'Doe', firstName:'John'}] → "Doe, J."
 */
export function formatAuthorsForPreview(authors: AuthorEntry[]): string {
  if (!Array.isArray(authors) || authors.length === 0) return ''
  return authors
    .map((a) => {
      const last = (a.lastName ?? '').trim()
      const first = (a.firstName ?? '').trim()
      if (!last && !first) return (a.email ?? '').trim()
      if (!last) return first
      if (!first) return last
      const initials = formatAuthorInitials(first)
      if (!initials) return last
      return `${last}, ${initials}`
    })
    .filter(Boolean)
    .join(' · ')
}

/** "Published Feb 2026" — uses current date unless a specific date is provided */
export function formatPublishedLabel(date?: Date | string | null): string {
  const d = date ? new Date(date) : new Date()
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date()
    return `Published ${fallback.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
  }
  return `Published ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}

function formatFileSizeLabel(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─────────────────────────────────────────────────────────────
// Preview Card — pure, controlled, no portal; reused inline by SubmitConfirmationModal
// Matches Figma 1519:7828 exactly: left bar 5px #707dff, title Sora 15px #10133a,
// author 12.5px #8a93b4, overview 12.5px #8a93b4, tags pill wrap, footer buttons
// ─────────────────────────────────────────────────────────────

export interface CapstonePreviewCardProps {
  title: string
  abstract: string
  tags: string[]
  authors: AuthorEntry[]
  document?: UploadDocumentValue | null
  /** Optional published date override for preview (defaults to now) */
  publishedDate?: Date | string | null
  /** When true, omit the outer shadow/border wrapper (e.g., when embedded) */
  inline?: boolean
}

export function CapstonePreviewCard({
  title,
  abstract,
  tags,
  authors,
  document,
  publishedDate,
  inline = false,
}: CapstonePreviewCardProps) {
  const displayTitle =
    (title ?? '').trim().length > 0 ? title.trim() : 'Untitled Capstone'
  const displayAbstract =
    (abstract ?? '').trim().length > 0
      ? abstract.trim()
      : 'No overview provided yet.'
  const authorLine = formatAuthorsForPreview(authors)
  const publishedLabel = formatPublishedLabel(publishedDate)
  const hasAuthors = authorLine.length > 0
  const safeTags = Array.isArray(tags)
    ? tags.filter((t) => typeof t === 'string' && t.trim().length > 0)
    : []

  const cardInner = (
    <>
      {/* Left accent bar — 5px #707dff, full height, rounded left when card has rounded-12 */}
      <div
        className="w-[5px] bg-[#707dff] shrink-0 self-stretch rounded-l-[12px]"
        aria-hidden="true"
      />

      {/* Content — p20 flex-col gap12 per figma */}
      <div className="flex-1 min-w-0 p-[20px] flex flex-col gap-[12px]">
        {/* Title — Sora bold 15px #10133a leading 21.75 */}
        <h3 className="font-heading font-bold text-[15px] leading-[21.75px] tracking-[-0.15px] text-[#10133a] break-words line-clamp-3">
          {displayTitle}
        </h3>

        {/* Author line — 12.5px medium #8a93b4 "Published Feb 2026 · Lastname, F.I. · ..." */}
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] break-words">
          {publishedLabel}
          {hasAuthors ? ` · ${authorLine}` : ''}
        </p>

        {/* Overview / Abstract — 12.5px regular #8a93b4 leading 20.625 */}
        <p className="font-sans font-normal text-[12.5px] leading-[20.625px] text-[#8a93b4] break-words whitespace-pre-wrap line-clamp-4">
          {displayAbstract}
        </p>

        {/* Tags — wrap flex-wrap gap5 h auto pills bg #f4f6ff border #e5e8ff h23 px9 py2 text 11px semibold #707dff rounded-full */}
        {safeTags.length > 0 ? (
          <div className="flex flex-wrap gap-[5px] w-full">
            {safeTags.map((tag, idx) => (
              <span
                key={`${tag}-${idx}`}
                className="inline-flex items-center h-[23px] px-[9px] py-[2px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="font-sans text-[11px] leading-[16px] text-[#bbc0d8]">
            No tags added yet.
          </p>
        )}

        {/* Footer — border-t #f0f2fa pt12 flex justify-end gap10 with Favorite/Details/Open buttons */}
        <div className="border-t border-[#f0f2fa] pt-[12px] mt-[4px] flex flex-wrap justify-end gap-[10px]">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Favorite"
            className="inline-flex items-center justify-center gap-[6px] h-[32px] px-[12px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-bold text-[12.5px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]"
          >
            <Star className="size-[12px] text-[#5a6382]" strokeWidth={2} />
            Favorite
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="View details"
            className="inline-flex items-center justify-center gap-[6px] h-[32px] px-[12px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-bold text-[12.5px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]"
          >
            <Eye className="size-[12px] text-[#5a6382]" strokeWidth={2} />
            Details
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Open document"
            className="inline-flex items-center justify-center gap-[6px] h-[32px] px-[12px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-bold text-[12.5px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.12)]"
          >
            <ExternalLink
              className="size-[12px] text-[#5a6382]"
              strokeWidth={2}
            />
            Open
          </button>
        </div>
      </div>
    </>
  )

  if (inline) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[12px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex overflow-hidden w-full">
        {cardInner}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[12px] shadow-[0px_8px_24px_rgba(16,19,58,0.10),0px_2px_8px_rgba(0,0,0,0.06)] flex overflow-hidden w-full">
      {cardInner}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal wrapper — portal, overlay, a11y, focus trap, animation
// Controlled props ensure live preview: parent owns title/abstract/tags/authors/document
// and this modal reflects them on every render/open with no stale closure.
// ─────────────────────────────────────────────────────────────

export interface CapstonePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  abstract: string
  tags: string[]
  authors: AuthorEntry[]
  document?: UploadDocumentValue | null
}

export function CapstonePreviewModal({
  isOpen,
  onClose,
  title,
  abstract,
  tags,
  authors,
  document: docValue,
}: CapstonePreviewModalProps) {
  const [mounted, setMounted] = useState(false)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => setMounted(true), [])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Body scroll lock + focus trap + Esc + initial focus when open
  useEffect(() => {
    if (!isOpen || !mounted) return

    const previouslyFocused = globalThis.document
      .activeElement as HTMLElement | null
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0] as HTMLElement
      const last = focusable[focusable.length - 1] as HTMLElement
      if (e.shiftKey) {
        if (globalThis.document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (globalThis.document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
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
  }, [isOpen, mounted, handleClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) handleClose()
    },
    [handleClose],
  )

  if (!mounted || !isOpen) return null

  const content = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      role="presentation"
      aria-hidden={false}
      style={{ animation: 'backdropIn 300ms ease-out' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capstone-preview-title"
        aria-describedby="capstone-preview-desc"
        className="relative w-full max-w-[600px] max-h-[min(90vh,720px)] flex flex-col"
        style={{ animation: 'modalEnter 350ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden heading for aria */}
        <h2 id="capstone-preview-title" className="sr-only">
          Capstone Preview
        </h2> 
        <p id="capstone-preview-desc" className="sr-only">
          Preview of how your capstone will appear in the Repository.
        </p>

        {/* Close button — floating, accessible */}
        <button
          ref={closeBtnRef}
          type="button"
          onClick={handleClose}
          aria-label="Close preview"
          className="absolute -top-[8px] -right-[8px] sm:top-[-10px] sm:right-[-10px] z-10 size-[32px] rounded-full bg-white border border-[#eceef8] shadow-[0px_4px_12px_rgba(16,19,58,0.12)] flex items-center justify-center hover:bg-[#f8f9ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)]"
        >
          <X className="size-[14px] text-[#5a6382]" strokeWidth={2} />
        </button>

        {/* Card — uses controlled props directly, no stale closure; re-renders on each open/value change */}
        <div className="overflow-y-auto rounded-[12px] max-h-[min(90vh,720px)]">
          <CapstonePreviewCard
            title={title}
            abstract={abstract}
            tags={tags}
            authors={authors}
            document={docValue}
          />
        </div>

        {/* Helper caption below card */}
        <p className="pt-[10px] text-center font-sans text-[11px] leading-[16px] text-white/80 drop-shadow">
          This is how your capstone will appear in the Repository.
        </p>
      </div>

      <style>{`@keyframes modalEnter{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes backdropIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  )

  return createPortal(content, globalThis.document.body)
}

export default CapstonePreviewModal
