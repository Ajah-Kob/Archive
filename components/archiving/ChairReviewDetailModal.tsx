'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText, ExternalLink, Download, Users, Check } from 'lucide-react'
import { toast } from 'sonner'
import { approveArchiving } from '@/lib/actions/archiving'
import type { ArchivingReviewItem } from '@/lib/actions/archiving'

interface ChairReviewDetailModalProps {
  submission: ArchivingReviewItem | null
  onClose: () => void
  onApproved?: () => void
}

function formatDateSubmitted(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function TagPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center h-[23px] px-[10px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap">
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: ArchivingReviewItem['status'] }) {
  if (status === 'ARCHIVED') {
    return (
      <span className="inline-flex items-center h-[22px] px-[8px] rounded-[7px] font-sans font-semibold text-[10.5px] leading-[15.75px] whitespace-nowrap border bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]">
        Archived
      </span>
    )
  }
  return (
    <span className="inline-flex items-center h-[22px] px-[8px] rounded-[7px] font-sans font-semibold text-[10.5px] leading-[15.75px] whitespace-nowrap border bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]">
      In Review
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading font-bold text-[11px] uppercase tracking-wider text-[#bbc0d8] mb-2">
      {children}
    </p>
  )
}

export function ChairReviewDetailModal({
  submission,
  onClose,
  onApproved,
}: ChairReviewDetailModalProps) {
  const router = useRouter()
  const [isApproving, setIsApproving] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)

  const isOpen = submission != null
  const isReview = submission?.status === 'IN_REVIEW'

  // Reset confirm when submission changes / modal reopens
  useEffect(() => {
    if (isOpen) setConfirmStep(false)
  }, [isOpen, submission?.id])

  // Escape + body scroll lock
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isApproving) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose, isApproving])

  if (!submission) return null

  async function handleApprove() {
    if (!submission) return
    if (!confirmStep) {
      setConfirmStep(true)
      return
    }
    setIsApproving(true)
    try {
      const res = await approveArchiving(submission.groupId)
      if (res.success) {
        toast.success(
          res.message || 'Capstone approved and published to Repository.',
        )
        onClose()
        onApproved?.()
        router.refresh()
      } else {
        // Handle already ARCHIVED / not in review etc.
        toast.error(res.message || 'Failed to approve submission.')
        // If already archived, refresh to reflect correct badge
        if (res.message?.toLowerCase().includes('already archived')) {
          router.refresh()
          onClose()
        }
      }
    } catch {
      toast.error('Failed to approve submission. Please try again.')
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(16,19,58,0.32)] backdrop-blur-[4px]"
        onClick={() => !isApproving && onClose()}
      />

      {/* Modal card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Archiving details"
        className={`relative w-full max-w-[720px] max-h-[85vh] bg-white rounded-[14px] border border-[#eceef8] shadow-[0_16px_48px_rgba(16,19,58,0.18)] flex flex-col overflow-hidden transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#f0f2fa] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-[28px] rounded-[8px] bg-[rgba(112,125,255,0.08)] border border-[rgba(112,125,255,0.12)] flex items-center justify-center shrink-0">
              <FileText
                className="size-[14px] text-[#707dff]"
                strokeWidth={2}
              />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-[14px] leading-[21px] text-[#10133a] truncate">
                Archiving Details
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={submission.status} />
            <button
              type="button"
              onClick={onClose}
              disabled={isApproving}
              aria-label="Close details"
              className="bg-[#fafbff] border border-[#eceef8] rounded-[10px] size-[30px] flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-60 shrink-0"
            >
              <X className="size-[14px] text-[#8a93b4]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* Group info */}
          <div className="flex flex-col gap-3 bg-[#fafbff] border border-[#e8ebf8] rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading font-bold text-[15px] leading-[22.5px] text-[#10133a] break-words">
                  {submission.groupName}
                </p>
                <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
                  {submission.sectionName ?? 'No section'} · Submitted{' '}
                  {formatDateSubmitted(submission.submittedAt)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 font-sans font-medium text-[11px] text-[#8a93b4] shrink-0">
                <Users className="size-[13px]" />{' '}
                {submission.groupMembers?.length ?? 0} members
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <SectionLabel>Research Title</SectionLabel>
            <p className="font-sans font-bold text-[13.5px] leading-[20px] text-[#1e2145] break-words">
              {submission.title}
            </p>
          </div>

          {/* Abstract */}
          <div>
            <SectionLabel>Abstract</SectionLabel>
            <p className="font-sans text-[13px] leading-[20px] text-[#5a6382] whitespace-pre-wrap break-words">
              {submission.abstract}
            </p>
          </div>

          {/* Tags */}
          <div>
            <SectionLabel>Tags</SectionLabel>
            {submission.tags.length === 0 ? (
              <p className="font-sans text-[12.5px] text-[#9ea8c6]">No tags</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {submission.tags.map((t) => (
                  <TagPill key={t} label={t} />
                ))}
              </div>
            )}
          </div>

          {/* Authors */}
          <div>
            <SectionLabel>Authors</SectionLabel>
            {submission.authorOrder.length === 0 ? (
              <p className="font-sans text-[12.5px] text-[#9ea8c6]">
                No authors
              </p>
            ) : (
              <div className="border border-[#e8ebf8] rounded-[10px] divide-y divide-[#f0f2fa] overflow-hidden bg-white">
                {submission.authorOrder.map((a, idx) => (
                  <div
                    key={`${a.email}-${idx}`}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="flex items-center justify-center size-[22px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] font-sans font-bold text-[10px] text-[#707dff] shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-sans font-semibold text-[12.5px] leading-[18px] text-[#1e2145] truncate">
                        {a.lastName
                          ? `${a.lastName}, ${a.firstName ?? ''}`.trim()
                          : (a.firstName ?? '—')}
                      </p>
                      <p className="font-sans text-[11.5px] leading-[14px] text-[#8a93b4] truncate">
                        {a.email ?? '—'}
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
          </div>

          {/* Document */}
          <div>
            <SectionLabel>Final Document</SectionLabel>
            {submission.blobUrl && submission.fileName ? (
              <div className="flex items-center justify-between gap-3 px-4 h-[64px] bg-[#fafbff] border border-[#e8ebf8] rounded-[12px]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-[36px] rounded-[8px] bg-white border border-[#e8ebf8] flex items-center justify-center shrink-0">
                    <FileText className="size-[16px] text-[#707dff]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#1e2145] truncate">
                      {submission.fileName}
                    </p>
                    <p className="font-sans text-[11px] leading-[16px] text-[#8a93b4]">
                      {submission.mimeType ?? 'application/pdf'}
                      {submission.size
                        ? ` · ${(submission.size / 1024).toFixed(1)} KB`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={submission.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-[32px] px-3 rounded-[9px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[12px] text-[#5a6382] hover:bg-[#f8f9ff] transition-colors"
                  >
                    <ExternalLink className="size-[13px]" /> View
                  </a>
                  <a
                    href={submission.blobUrl}
                    download={submission.fileName}
                    className="inline-flex items-center gap-1.5 h-[32px] px-3 rounded-[9px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[12px] text-[#5a6382] hover:bg-[#f8f9ff] transition-colors"
                  >
                    <Download className="size-[13px]" /> Download
                  </a>
                </div>
              </div>
            ) : (
              <p className="font-sans text-[12.5px] text-[#9ea8c6]">
                No document attached
              </p>
            )}
          </div>

          {/* Warning when confirming */}
          {confirmStep && isReview && (
            <div className="rounded-[10px] border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.07)] px-4 py-3">
              <p className="font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#92400e]">
                Are you sure you want to approve?
              </p>
              <p className="font-sans text-[12px] leading-[18px] text-[#78350f] mt-1">
                Once approved, this capstone will be published to the Repository
                as <span className="font-semibold">ARCHIVED</span> and cannot be
                reverted. The submission will become read-only for the student
                group.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#f0f2fa] px-6 py-4 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => {
              if (confirmStep) setConfirmStep(false)
              else onClose()
            }}
            disabled={isApproving}
            className="h-[36px] px-[16px] rounded-[9px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] text-[#5a6382] hover:bg-[#f8f9ff] disabled:opacity-60 transition-colors"
          >
            {confirmStep ? 'Cancel' : 'Close'}
          </button>
          {isReview && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving}
              className="inline-flex items-center justify-center gap-1.5 h-[36px] px-[18px] rounded-[9px] font-heading font-semibold text-[13px] text-white shadow-[0px_2px_6px_rgba(22,163,74,0.28)] disabled:opacity-70 transition-opacity bg-gradient-to-r from-[#16a34a] to-[#15803d] border border-[rgba(22,163,74,0.25)] min-w-[110px]"
            >
              {isApproving ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-[14px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Approving...
                </span>
              ) : confirmStep ? (
                <>
                  <Check className="size-[14px]" strokeWidth={2.5} /> Confirm
                  Approve
                </>
              ) : (
                <>
                  <Check className="size-[14px]" strokeWidth={2.5} /> Approve
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
