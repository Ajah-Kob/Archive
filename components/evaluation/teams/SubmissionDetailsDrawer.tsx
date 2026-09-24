'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  History,
  LayoutPanelLeft,
} from 'lucide-react'
import type {
  EvaluationItem,
  EvaluationVersion,
  EvaluationVersionsPayload,
} from '@/lib/actions/evaluation'
import { getEvaluationVersions } from '@/lib/actions/evaluation'
import { SubmissionStatusBadge } from '@/components/milestones/chapter/SubmissionStatusBadge'
import { Drawer } from '@/components/ui/Drawer'
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
  const [requestState, setRequestState] = useState<{
    requestKey: number | null
    detail: EvaluationVersionsPayload | null
  }>({
    requestKey: null,
    detail: null,
  })

  const loadVersions = useCallback(
    (submissionId: number) => getEvaluationVersions(submissionId),
    [],
  )

  useEffect(() => {
    if (!submission) return
    let cancelled = false
    const submissionRequestKey = submission.id

    void loadVersions(submissionRequestKey).then(
      (res) => {
        if (cancelled) return
        setRequestState({
          requestKey: submissionRequestKey,
          detail: res.success ? (res.payload ?? null) : null,
        })
      },
      () => {
        if (cancelled) return
        setRequestState({ requestKey: submissionRequestKey, detail: null })
      },
    )

    return () => {
      cancelled = true
    }
  }, [submission, loadVersions])

  // Derive the active response so a new request cannot display stale detail.
  const requestKey = submission?.id ?? null
  const detail =
    requestKey != null && requestState.requestKey === requestKey
      ? requestState.detail
      : null
  const loading = requestKey != null && requestState.requestKey !== requestKey
  const currentVersion = detail?.versions.find((v) => v.isCurrent)
  const previousVersions = (detail?.versions ?? []).filter((v) => !v.isCurrent)

  return (
    <Drawer open={submission != null} onClose={onClose} size="sm">
      <Drawer.Header
        title="Submission Details"
        subtitle="View submission details and version history."
      />
      <Drawer.Body>
        {submission ? (
          <div className="flex flex-col gap-[22px] px-6 py-4">
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
                        inReviewLabel="For Review"
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
                            inReviewLabel="For Review"
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

            </div>
          ) : null}
        </Drawer.Body>

        {submission && currentVersion ? (
          <Drawer.Footer>
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
          </Drawer.Footer>
        ) : null}
    </Drawer>
  )
}
