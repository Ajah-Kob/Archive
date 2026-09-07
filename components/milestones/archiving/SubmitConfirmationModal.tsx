'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X, FileText, TriangleAlert, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { submitArchiving } from '@/lib/actions/archiving'
import type { AuthorEntry } from '@/lib/archiving/validation'
import type { UploadDocumentValue } from './fields/UploadDocument'
import { CapstonePreviewCard } from './CapstonePreviewModal'

// ─────────────────────────────────────────────────────────────
// Pure helpers — keep logic testable and side-effect free
// ─────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatAuthorsSummary(authors: AuthorEntry[]): string {
  if (!Array.isArray(authors) || authors.length === 0) return '—'
  return authors
    .map((a) => {
      const last = (a.lastName ?? '').trim()
      const first = (a.firstName ?? '').trim()
      if (!last && !first) return (a.email ?? '').trim()
      if (!last) return first
      if (!first) return last
      return `${last}, ${first}`
    })
    .join('; ')
}

// ─────────────────────────────────────────────────────────────
// Subcomponents — composition over prop drilling
// Each small, focused, <50 lines, pure where possible
// ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="font-heading font-bold text-[11px] uppercase tracking-[0.6px] text-[#9ea8c6] mb-[6px]">
      {children}
    </p>
  )
}

function TagPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center h-[23px] px-[9px] py-[2px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap">
      {label}
    </span>
  )
}

function SummaryTabContent({
  title,
  abstract,
  tags,
  authors,
  docValue,
}: {
  title: string
  abstract: string
  tags: string[]
  authors: AuthorEntry[]
  docValue: UploadDocumentValue | null | undefined
}) {
  const safeTags = Array.isArray(tags) ? tags.filter((t) => t.trim().length > 0) : []
  const hasTitle = (title ?? '').trim().length > 0
  const hasAbstract = (abstract ?? '').trim().length > 0

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Research Title */}
      <div>
        <SectionLabel>Research Title</SectionLabel>
        <p className="font-sans font-bold text-[13.5px] leading-[20px] text-[#1e2145] break-words whitespace-pre-wrap">
          {hasTitle ? title.trim() : <span className="text-[#9ea8c6] font-medium">No title provided</span>}
        </p>
      </div>

      {/* Abstract */}
      <div>
        <SectionLabel>Abstract</SectionLabel>
        <p className="font-sans font-normal text-[12.5px] leading-[20px] text-[#5a6382] break-words whitespace-pre-wrap">
          {hasAbstract ? abstract.trim() : <span className="text-[#9ea8c6]">No abstract provided</span>}
        </p>
      </div>

      {/* Tags */}
      <div>
        <SectionLabel>Tags</SectionLabel>
        {safeTags.length === 0 ? (
          <p className="font-sans text-[12px] leading-[16px] text-[#9ea8c6]">No tags</p>
        ) : (
          <div className="flex flex-wrap gap-[5px]">
            {safeTags.map((t, idx) => (
              <TagPill key={`${t}-${idx}`} label={t} />
            ))}
          </div>
        )}
      </div>

      {/* Authors ordered list — 1. Lastname, Firstname Email */}
      <div>
        <SectionLabel>Authors (in order)</SectionLabel>
        {authors.length === 0 ? (
          <p className="font-sans text-[12px] leading-[16px] text-[#9ea8c6]">No authors</p>
        ) : (
          <div className="rounded-[10px] border border-[#e8ebf8] divide-y divide-[#f0f2fa] overflow-hidden bg-white">
            {authors.map((a, idx) => (
              <div key={`${a.email}-${idx}-${a.lastName}`} className="flex items-center gap-[12px] px-[12px] py-[10px]">
                <span className="shrink-0 size-[24px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] flex items-center justify-center font-sans font-bold text-[11px] leading-none text-[#707dff]">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-sans font-semibold text-[12.5px] leading-[18px] text-[#1e2145] truncate">
                    {a.lastName?.trim() ? `${a.lastName.trim()}, ${a.firstName?.trim() ?? ''}`.trim() : a.firstName?.trim() ?? '—'}
                  </p>
                  <p className="font-sans font-medium text-[11.5px] leading-[14px] text-[#8a93b4] truncate">
                    {a.email?.trim() ?? '—'}
                  </p>
                </div>
                {a.userId != null ? (
                  <span className="hidden sm:inline-flex items-center h-[20px] px-[7px] rounded-full bg-[rgba(22,163,74,0.07)] border border-[rgba(22,163,74,0.2)] font-sans font-semibold text-[10px] text-[#16a34a] shrink-0">
                    Linked
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center h-[20px] px-[7px] rounded-full bg-[#f8f9ff] border border-[#e5e8ff] font-sans font-medium text-[10px] text-[#8a93b4] shrink-0">
                    Custom
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="font-sans text-[11px] leading-[16px] text-[#9ea8c6] mt-[6px]">
          Order is preserved exactly as submitted — {formatAuthorsSummary(authors).slice(0, 60)}
          {formatAuthorsSummary(authors).length > 60 ? '…' : ''}
        </p>
      </div>

      {/* Document row — name/meta */}
      <div>
        <SectionLabel>Final Document</SectionLabel>
        {docValue?.fileName && docValue?.blobUrl ? (
          <div className="flex items-center gap-[12px] px-[12px] h-[64px] rounded-[10px] bg-[#fafbff] border border-[#e8ebf8]">
            <div className="size-[36px] rounded-[8px] bg-white border border-[#e8ebf8] flex items-center justify-center shrink-0">
              <FileText className="size-[16px] text-[#707dff]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-sans font-semibold text-[12.5px] leading-[16px] text-[#1e2145] truncate" title={docValue.fileName}>
                {docValue.fileName}
              </p>
              <p className="font-sans font-medium text-[11px] leading-[14px] text-[#8a93b4] truncate">
                PDF · {formatFileSize(docValue.size)} {docValue.mimeType ? `· ${docValue.mimeType}` : ''}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center rounded-full bg-white border border-[#e5e8ff] px-[8px] py-[3px] font-sans font-semibold text-[11px] text-[#707dff]">
              Ready
            </span>
          </div>
        ) : (
          <div className="rounded-[10px] border border-dashed border-[#e8ebf8] bg-[#fafbff] px-[12px] py-[12px]">
            <p className="font-sans text-[12px] leading-[16px] text-[#9ea8c6]">No document attached</p>
          </div>
        )}
      </div>

      {/* Metadata — small helper line */}
      <div className="rounded-[10px] bg-[#f8f9ff] border border-[#eef0fb] px-[12px] py-[10px] flex flex-wrap gap-x-[12px] gap-y-[4px]">
        <span className="font-sans font-medium text-[11px] leading-[14px] text-[#8a93b4]">
          {tags.length} tag{tags.length === 1 ? '' : 's'}
        </span>
        <span className="font-sans font-medium text-[11px] leading-[14px] text-[#8a93b4]">·</span>
        <span className="font-sans font-medium text-[11px] leading-[14px] text-[#8a93b4]">
          {authors.length} author{authors.length === 1 ? '' : 's'}
        </span>
        <span className="font-sans font-medium text-[11px] leading-[14px] text-[#8a93b4]">·</span>
        <span className="font-sans font-medium text-[11px] leading-[14px] text-[#8a93b4]">
          {docValue?.fileName ? 'Document ready' : 'Document missing'}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main modal — controlled props, composition, accessible, animated
// Tabs: Summary | Preview — Summary shows full details, Preview shows CapstonePreview card
// Footer: warning red callout + Cancel + Confirm Submit Capstone (gradient #707dff)
// Handles double-submit guard, submitArchiving, toast, close, onSuccess (status → IN_REVIEW)
// ─────────────────────────────────────────────────────────────

export interface SubmitConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  abstract: string
  tags: string[]
  authors: AuthorEntry[]
  document?: UploadDocumentValue | null
  /** Called after successful submit — parent should refresh and lock form (status → IN_REVIEW) */
  onSuccess?: () => void
}

export function SubmitConfirmationModal({
  isOpen,
  onClose,
  title,
  abstract,
  tags,
  authors,
  document: docValue,
  onSuccess,
}: SubmitConfirmationModalProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'preview'>('summary')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const router = useRouter()

  useEffect(() => setMounted(true), [])

  // Reset tab to summary each time modal opens — ensures fresh view
  useEffect(() => {
    if (isOpen) setActiveTab('summary')
  }, [isOpen])

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    onClose()
  }, [isSubmitting, onClose])

  // Focus trap + Esc + body lock
  useEffect(() => {
    if (!isOpen || !mounted) return

    const previouslyFocused = globalThis.document.activeElement as HTMLElement | null
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
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
  }, [isOpen, mounted, handleClose, isSubmitting])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) handleClose()
    },
    [handleClose],
  )

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('title', (title ?? '').trim())
      formData.set('abstract', (abstract ?? '').trim())
      formData.set('tags', JSON.stringify(Array.isArray(tags) ? tags : []))
      formData.set('authorOrder', JSON.stringify(Array.isArray(authors) ? authors : []))
      if (docValue?.blobUrl) {
        formData.set('blobUrl', docValue.blobUrl)
        if (docValue.fileName) formData.set('fileName', docValue.fileName)
        if (docValue.mimeType) formData.set('mimeType', docValue.mimeType)
        if (docValue.size != null) formData.set('size', String(docValue.size))
      }

      const res = await submitArchiving(null, formData)

      if (res.success) {
        toast.success(res.message || 'Capstone submitted for review.')
        onClose()
        onSuccess?.()
        router.refresh()
      } else {
        // Double-submit guard message is user-friendly from server
        toast.error(res.message || 'Failed to submit capstone. Please try again.')
      }
    } catch {
      toast.error('Failed to submit capstone. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, title, abstract, tags, authors, docValue, onClose, onSuccess, router])

  if (!mounted || !isOpen) return null

  const content = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      role="presentation"
      style={{ animation: 'backdropIn 300ms ease-out' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-confirm-title"
        aria-describedby="submit-confirm-desc"
        className="relative bg-white rounded-[14px] shadow-[0_24px_64px_rgba(16,19,58,0.16),0_4px_16px_rgba(0,0,0,0.06)] border border-[#eceef8] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        style={{ animation: 'modalEnter 350ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — title + close + Tabs */}
        <div className="px-[24px] pt-[20px] pb-[14px] border-b border-[#f0f2fa] shrink-0 flex flex-col gap-[14px] bg-white">
          <div className="flex items-start justify-between gap-[16px]">
            <div className="min-w-0">
              <h2
                id="submit-confirm-title"
                className="font-heading font-bold text-[16px] leading-[24px] tracking-[-0.16px] text-[#10133a]"
              >
                Confirm Submission
              </h2>
              <p
                id="submit-confirm-desc"
                className="font-sans font-medium text-[12.5px] leading-[18px] text-[#8a93b4] pt-[2px]"
              >
                Review your capstone details before submitting for Program Chair review.
              </p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label="Close confirmation"
              className="size-[30px] rounded-[10px] bg-[#fafbff] border border-[#eceef8] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)]"
            >
              <X className="size-[14px] text-[#8a93b4]" strokeWidth={2} />
            </button>
          </div>

          {/* Tabs — Summary | Preview */}
          <div
            role="tablist"
            aria-label="Confirmation view"
            className="flex gap-[8px] p-[4px] rounded-[10px] bg-[#f8f9ff] border border-[#eceef8] self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'summary'}
              aria-controls="tab-summary"
              id="tab-btn-summary"
              onClick={() => setActiveTab('summary')}
              className={`h-[30px] px-[14px] rounded-[8px] font-sans font-semibold text-[12.5px] leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)] ${
                activeTab === 'summary'
                  ? 'bg-[#707dff] text-white shadow-[0px_2px_6px_rgba(112,125,255,0.28)]'
                  : 'bg-[#f4f6ff] text-[#5a6382] hover:bg-[#eef0ff] border border-transparent'
              }`}
            >
              Summary
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'preview'}
              aria-controls="tab-preview"
              id="tab-btn-preview"
              onClick={() => setActiveTab('preview')}
              className={`h-[30px] px-[14px] rounded-[8px] font-sans font-semibold text-[12.5px] leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.2)] ${
                activeTab === 'preview'
                  ? 'bg-[#707dff] text-white shadow-[0px_2px_6px_rgba(112,125,255,0.28)]'
                  : 'bg-[#f4f6ff] text-[#5a6382] hover:bg-[#eef0ff] border border-transparent'
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Body — scrollable; Summary shows full details, Preview shows CapstonePreview card */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'summary' ? (
            <div id="tab-summary" role="tabpanel" aria-labelledby="tab-btn-summary" className="px-[24px] py-[20px]">
              <SummaryTabContent title={title} abstract={abstract} tags={tags} authors={authors} docValue={docValue} />
            </div>
          ) : (
            <div id="tab-preview" role="tabpanel" aria-labelledby="tab-btn-preview" className="px-[24px] py-[20px] flex justify-center">
              <div className="w-full max-w-[560px]">
                <CapstonePreviewCard
                  title={title}
                  abstract={abstract}
                  tags={tags}
                  authors={authors}
                  document={docValue}
                />
                <p className="pt-[10px] text-center font-sans text-[11px] leading-[16px] text-[#8a93b4]">
                  Repository preview — tags wrap to new line, authors formatted as Lastname, Initials.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer — warning red callout + Cancel + Confirm Submit Capstone */}
        <div className="border-t border-[#f0f2fa] bg-white px-[24px] py-[16px] shrink-0 flex flex-col gap-[12px]">
          {/* Warning — red callout bg rgba(225,29,72,0.07) border rgba(225,29,72,0.2) text #e11d48 */}
          <div
            role="alert"
            className="rounded-[10px] border border-[rgba(225,29,72,0.2)] bg-[rgba(225,29,72,0.07)] px-[14px] py-[10px] flex items-start gap-[10px]"
          >
            <TriangleAlert className="size-[16px] text-[#e11d48] shrink-0 mt-[1px]" strokeWidth={2} />
            <p className="font-sans font-medium text-[12.5px] leading-[18px] text-[#e11d48]">
              Once submitted, the capstone details cannot be changed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-[10px]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-semibold text-[13px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              aria-label="Confirm submit capstone"
              className="inline-flex items-center justify-center gap-[8px] h-[36px] px-[18px] rounded-[9px] font-heading font-semibold text-[13px] leading-none text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] bg-gradient-to-r from-[#707dff] to-[#5565ff] border border-[rgba(112,125,255,0.2)] hover:opacity-95 active:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.3)] min-w-[180px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-[14px] animate-spin" style={{ animationDuration: '1000ms' } as React.CSSProperties} />
                  Submitting…
                </>
              ) : (
                'Confirm Submit Capstone'
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes modalEnter{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes backdropIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  )

  return createPortal(content, globalThis.document.body)
}

export default SubmitConfirmationModal
