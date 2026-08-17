'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  FileText,
  History,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react'
import type {
  EvaluationItem,
  EvaluationVersion,
  EvaluationVersionsPayload,
} from '@/lib/actions/evaluation'
import {
  getEvaluationVersions,
  reviewSubmission,
} from '@/lib/actions/evaluation'
import { SubmissionStatusBadge } from '@/components/milestones/chapter/SubmissionStatusBadge'
import type { SubmissionViewStatus } from '@/types/milestones'

interface SubmissionDetailsDrawerProps {
  submission: EvaluationItem | null
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Map the DB review status to the shared view status. SUPERSEDED is a
// UI-only display state: every non-current (soft-deleted) version renders
// the muted Superseded treatment regardless of its historical DB status.
function toViewStatus(version: EvaluationVersion): SubmissionViewStatus {
  if (!version.isCurrent) return 'SUPERSEDED'
  if (version.status === 'NEED_REVISION') return 'NEEDS_REVISION'
  if (version.status === 'APPROVED') return 'APPROVED'
  return 'IN_REVIEW'
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans font-extrabold text-[10px] leading-[15px] tracking-[0.9px] uppercase text-[#bbc0d8]">
      {children}
    </p>
  )
}

export function SubmissionDetailsDrawer({
  submission,
  onClose,
}: SubmissionDetailsDrawerProps) {
  const router = useRouter()
  const [detail, setDetail] = useState<EvaluationVersionsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewMode, setReviewMode] = useState<'approve' | 'revision' | null>(
    null,
  )
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const loadVersions = useCallback(async (submissionId: number) => {
    const res = await getEvaluationVersions(submissionId)
    if (res.success) setDetail(res.payload ?? null)
  }, [])

  useEffect(() => {
    if (!submission) return
    setLoading(true)
    setDetail(null)
    setReviewOpen(false)
    setReviewMode(null)
    setNote('')
    setBusy(false)
    loadVersions(submission.id).finally(() => setLoading(false))
  }, [submission, loadVersions])

  async function submitReview(decision: 'APPROVED' | 'NEED_REVISION') {
    if (!submission) return
    if (decision === 'NEED_REVISION' && !note.trim()) {
      toast.error('Feedback is required when requesting revisions.')
      return
    }
    setBusy(true)
    const res = await reviewSubmission(
      submission.id,
      decision,
      note.trim() || null,
    )
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setReviewOpen(false)
      setReviewMode(null)
      setNote('')
      loadVersions(submission.id)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  const isOpen = submission != null
  const currentVersion = detail?.versions.find((v) => v.isCurrent)
  const previousVersions = (detail?.versions ?? []).filter((v) => !v.isCurrent)

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-dvh w-[500px] z-50 bg-white border-l border-[#eceef8] shadow-[-8px_0px_40px_rgba(112,125,255,0.14)] transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-[16px] px-6 py-4 border-b border-[#eceef8] shrink-0">
          <div>
            <p className="font-heading font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]">
              Submission Details
            </p>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
              Review this chapter submission and request revisions if needed.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-[#fafbff] border border-[#eceef8] rounded-[14px] size-[28px] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 px-6 py-4 overflow-y-auto">
          {submission && (
            <div className="flex flex-col gap-[22px]">
              <div className="flex flex-col gap-[10px]">
                <SectionHeading>Current Submission</SectionHeading>
                <div className="border border-[#eceef8] rounded-[9px] px-[14px] py-[13px]">
                  <div className="flex items-center justify-between gap-[10px]">
                    <p className="truncate font-sans font-bold text-[14px] leading-[21px] text-[#1e2145]">
                      {submission.groupName}
                    </p>
                    {currentVersion && (
                      <SubmissionStatusBadge
                        status={toViewStatus(currentVersion)}
                      />
                    )}
                  </div>
                  <p className="pt-[4px] font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                    {submission.chapter}
                  </p>

                  <div className="mt-[12px] flex flex-col gap-[9px]">
                    <div className="flex items-center gap-[8px]">
                      <FileText
                        className="size-[14px] text-[#9ea8c6] shrink-0"
                        strokeWidth={1.75}
                      />
                      <p className="truncate font-sans font-medium text-[12.5px] leading-[18.75px] text-[#5a6382]">
                        {submission.fileName}
                      </p>
                    </div>
                    <div className="flex items-center gap-[8px]">
                      <span className="flex items-center justify-center size-[18px] rounded-[5px] bg-[#f4f5fc] text-[8.5px] font-bold text-[#9ea8c6] shrink-0">
                        {submission.mimeType.split('/')[1]?.toUpperCase() ?? 'FILE'}
                      </span>
                      <p className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
                        {formatSize(submission.size)}
                      </p>
                      <div className="flex-1" />
                      <a
                        href={submission.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View current document"
                        aria-label={`View ${submission.fileName} (opens in new tab)`}
                        className="flex items-center gap-[5px] h-[26px] px-[10px] bg-white border border-[#e8ebf8] rounded-[7px] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] shrink-0"
                      >
                        <FileText className="size-[11px]" />
                        View
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-[10px]">
                <SectionHeading>Submitted By</SectionHeading>
                <div className="flex items-center gap-[10px]">
                  <div className="size-[32px] rounded-full bg-[rgba(112,125,255,0.12)] flex items-center justify-center shrink-0">
                    <span className="font-sans font-bold text-[11px] text-[#707dff]">
                      {submission.submittedBy
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                      {submission.submittedBy || 'Unknown'}
                    </p>
                    <p className="font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                      {formatDate(submission.dateSubmitted)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-[10px]">
                <div className="flex items-center gap-[8px]">
                  <SectionHeading>Previous Versions</SectionHeading>
                  {previousVersions.length > 0 && (
                    <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[8px] py-[2px] font-sans font-bold text-[10.5px] text-[#707dff]">
                      {previousVersions.length}
                    </span>
                  )}
                </div>

                <div className="border border-[#eceef8] rounded-[9px] divide-y divide-[#f4f5fc]">
                  {loading ? (
                    <div className="px-[14px] py-[11px]">
                      <span className="font-sans font-medium text-[12.5px] text-[#9ea8c6]">
                        Loading versions…
                      </span>
                    </div>
                  ) : previousVersions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center px-[8px] py-[18px]">
                      <div className="size-[40px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
                        <History
                          className="size-[18px] text-[#c4cadf]"
                          strokeWidth={1.75}
                        />
                      </div>
                      <p className="pt-[8px] font-sans font-semibold text-[12.5px] text-[#8a93b4]">
                        No previous versions
                      </p>
                      <p className="pt-[3px] font-sans font-medium text-[11px] text-[#c4cadf] leading-[16.5px]">
                        Resubmissions of this chapter will appear here.
                      </p>
                    </div>
                  ) : (
                    previousVersions.map((version) => (
                      <div key={version.id} className="px-[14px] py-[11px]">
                        <div className="flex items-center justify-between gap-[8px]">
                          <div className="flex items-center gap-[7px] min-w-px">
                            <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff] shrink-0">
                              v{version.version}
                            </span>
                            <p className="truncate font-sans font-semibold text-[12.5px] leading-[17px] text-[#3c4268]">
                              {version.fileName}
                            </p>
                          </div>
                          <a
                            href={version.blobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View document"
                            aria-label={`View ${version.fileName} (opens in new tab)`}
                            className="flex items-center gap-[5px] h-[26px] px-[10px] bg-white border border-[#e8ebf8] rounded-[7px] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] shrink-0"
                          >
                            <FileText className="size-[11px]" />
                            View
                          </a>
                        </div>
                        <div className="pt-[5px] flex items-center gap-[8px]">
                          <SubmissionStatusBadge status={toViewStatus(version)} />
                          {version.reviewedAt && (
                            <span className="flex items-center gap-[5px] font-sans font-medium text-[11px] text-[#9ea8c6]">
                              <CalendarDays
                                className="size-[11px] text-[#9ea8c6]"
                                strokeWidth={1.75}
                              />
                              Reviewed {formatDate(version.reviewedAt)}
                            </span>
                          )}
                        </div>
                        <p className="pt-[4px] font-sans font-medium text-[11px] text-[#9ea8c6]">
                          Submitted {formatDate(version.createdAt)} by{' '}
                          {version.submittedBy || 'Unknown'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-[10px] pb-[4px]">
                {!reviewOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewOpen(true)
                      setReviewMode(null)
                      setNote('')
                    }}
                    title="Evaluate current document"
                    className="flex items-center justify-center gap-[8px] w-full h-[40px] rounded-[10px] bg-[#16a34a] font-sans font-bold text-[13px] text-white hover:bg-[#15803d] transition-colors"
                  >
                    <ClipboardCheck className="size-[16px]" strokeWidth={2.25} />
                    Evaluate Current Document
                  </button>
                ) : reviewMode === 'revision' ? (
                  <div className="border border-[#eceef8] rounded-[10px] bg-white p-[14px] flex flex-col gap-[10px] shadow-[0_8px_24px_rgba(112,125,255,0.12)]">
                    <p className="font-sans font-bold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                      Request Revisions
                    </p>
                    <label className="font-sans font-semibold text-[11px] leading-[16px] text-[#5a6382]">
                      Revision note <span className="text-[#e11d48]">*</span>
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Explain what the group needs to revise…"
                      className="w-full px-[12px] py-[9px] bg-white border border-[#e8ebf8] rounded-[8px] font-sans font-medium text-[12.5px] leading-[18.75px] text-[#3d4566] outline-none focus:border-[rgba(112,125,255,0.5)] transition-colors resize-none"
                    />
                    <div className="flex items-center justify-end gap-[8px]">
                      <button
                        type="button"
                        onClick={() => setReviewMode(null)}
                        disabled={busy}
                        className="h-[32px] px-[12px] rounded-[8px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors disabled:opacity-60"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => submitReview('NEED_REVISION')}
                        disabled={busy || !note.trim()}
                        className="flex items-center gap-[6px] h-[32px] px-[14px] rounded-[8px] bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] font-sans font-bold text-[11px] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.14)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? (
                          <Loader2 className="size-[13px] animate-spin" />
                        ) : (
                          <RotateCcw className="size-[13px]" />
                        )}
                        Send Revision Request
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-[#eceef8] rounded-[10px] bg-white p-[14px] flex flex-col gap-[10px] shadow-[0_8px_24px_rgba(112,125,255,0.12)]">
                    <p className="font-sans font-bold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                      Evaluate Current Document
                    </p>
                    <div className="flex items-center gap-[8px]">
                      <button
                        type="button"
                        onClick={() => submitReview('APPROVED')}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-[6px] h-[36px] rounded-[9px] bg-[#16a34a] font-sans font-bold text-[12px] text-white hover:bg-[#15803d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? (
                          <Loader2 className="size-[13px] animate-spin" />
                        ) : (
                          <Check className="size-[13px]" strokeWidth={2.5} />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewMode('revision')}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-[6px] h-[36px] rounded-[9px] bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] font-sans font-bold text-[12px] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.14)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="size-[13px]" />
                        Request Revisions
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewOpen(false)}
                      disabled={busy}
                      className="self-center font-sans font-semibold text-[11px] text-[#9ea8c6] hover:text-[#5a6382] transition-colors disabled:opacity-60"
                    >
                      Cancel review
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
