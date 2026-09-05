'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  History,
  LayoutPanelLeft,
  X,
} from 'lucide-react'
import type {
  EvaluationItem,
  EvaluationVersion,
  EvaluationVersionsPayload,
} from '@/lib/actions/evaluation'
import { getEvaluationVersions } from '@/lib/actions/evaluation'
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

  const loadVersions = useCallback(async (submissionId: number) => {
    const res = await getEvaluationVersions(submissionId)
    if (res.success) setDetail(res.payload ?? null)
  }, [])

  useEffect(() => {
    if (!submission) return
    setLoading(true)
    setDetail(null)
    loadVersions(submission.id).finally(() => setLoading(false))
  }, [submission, loadVersions])

  const isOpen = submission != null
  const currentVersion = detail?.versions.find((v) => v.isCurrent)
  const previousVersions = (detail?.versions ?? []).filter((v) => !v.isCurrent)

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] transition-all duration-300 ${
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
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
              View submission details and version history.
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
                        {submission.mimeType.split('/')[1]?.toUpperCase() ??
                          'FILE'}
                      </span>
                      <p className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
                        {formatSize(submission.size)}
                      </p>
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
                            href={`/faculty/document-review/${version.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open this version in its own workspace (new tab)"
                            aria-label={`Open version ${version.version} of ${version.fileName} in a new workspace tab`}
                            className="flex items-center gap-[5px] h-[26px] px-[10px] bg-white border border-[#e8ebf8] rounded-[7px] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] shrink-0"
                          >
                            <FileText className="size-[11px]" />
                            View
                          </a>
                        </div>
                        <div className="pt-[5px] flex items-center gap-[8px]">
                          <SubmissionStatusBadge
                            status={toViewStatus(version)}
                          />
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

              {/* Primary action — verdicts happen in the workspace only, and
                  only while the submission is still PENDING. Finalized
                  submissions get a read-only "View Evaluation" path to the
                  locked workspace (committed annotations, no editing). */}
              {currentVersion && (
                <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-[10px] pb-[4px]">
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      router.push(`/faculty/document-review/${submission.id}`)
                    }}
                    title={
                      currentVersion.status === 'PENDING'
                        ? 'Evaluate Document'
                        : 'View Evaluation'
                    }
                    className={`flex items-center justify-center gap-[8px] w-full h-[40px] rounded-[10px] font-sans font-bold text-[13px] text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 outline-none ${
                      currentVersion.status === 'PENDING'
                        ? 'bg-[#16a34a] hover:bg-[#15803d] focus-visible:ring-[rgba(22,163,74,0.4)]'
                        : 'bg-[#707dff] hover:bg-[#5565ff] focus-visible:ring-[#707dff]'
                    }`}
                  >
                    {currentVersion.status === 'PENDING' ? (
                      <ClipboardCheck
                        className="size-[16px]"
                        strokeWidth={2.25}
                      />
                    ) : (
                      <LayoutPanelLeft
                        className="size-[15px]"
                        strokeWidth={2.25}
                      />
                    )}
                    {currentVersion.status === 'PENDING'
                      ? 'Evaluate Document'
                      : 'View Evaluation'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
