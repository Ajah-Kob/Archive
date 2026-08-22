'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CalendarDays,
  ExternalLink,
  History,
  Loader2,
  TriangleAlert,
} from 'lucide-react'
import type {
  EvaluationVersion,
  EvaluationVersionsPayload,
} from '@/lib/actions/evaluation'
import { getEvaluationVersions } from '@/lib/actions/evaluation'
import { SubmissionStatusBadge } from '@/components/milestones/chapter/SubmissionStatusBadge'
import type { SubmissionViewStatus } from '@/types/milestones'
import { WorkspacePanel } from '@/components/evaluation/workspace/WorkspacePanel'

interface VersionDrawerProps {
  /** MilestoneSubmission id whose version chain should be listed. */
  submissionId: number
  onClose: () => void
  /** Opens the version as a new tab in the workspace (wired to addDocument). */
  onOpenVersion: (version: EvaluationVersion) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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

/**
 * Right-side panel listing every version of a chapter submission. The parent
 * orchestrator mounts this panel on demand (submissionId is always valid).
 *
 * Clicking a row calls `onOpenVersion(version)`; the orchestrator wires that
 * to DocumentManagerPluginPackage.addDocument so the version opens as a new
 * tab in the workspace.
 */
export function VersionDrawer({
  submissionId,
  onClose,
  onOpenVersion,
}: VersionDrawerProps) {
  const [detail, setDetail] = useState<EvaluationVersionsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadVersions = useCallback(async (id: number) => {
    setLoading(true)
    setError(null)
    const res = await getEvaluationVersions(id)
    if (res.success) {
      setDetail(res.payload ?? null)
    } else {
      setDetail(null)
      setError(res.message || 'Failed to load versions.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    setDetail(null)
    loadVersions(submissionId)
  }, [submissionId, loadVersions])

  // Close on Escape — standard panel behavior.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const versions = detail?.versions ?? []

  return (
    <WorkspacePanel
      title="Versions"
      subtitle="Open any version as a new tab in the workspace."
      count={versions.length}
      onClose={onClose}
    >
      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center gap-[8px]">
          <SectionHeading>{detail?.chapter ?? 'All Versions'}</SectionHeading>
        </div>

        <div className="border border-[#eceef8] rounded-[9px] divide-y divide-[#f4f5fc]">
          {loading ? (
            <div className="flex flex-col items-center justify-center text-center px-[8px] py-[24px]">
              <Loader2 className="size-[18px] animate-spin text-[#707dff]" />
              <p className="pt-[8px] font-sans font-medium text-[12.5px] text-[#9ea8c6]">
                Loading versions…
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center px-[8px] py-[18px]">
              <div className="size-[40px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
                <TriangleAlert
                  className="size-[18px] text-[#d97706]"
                  strokeWidth={1.75}
                />
              </div>
              <p className="pt-[8px] font-sans font-semibold text-[12.5px] text-[#8a93b4]">
                Couldn't load versions
              </p>
              <p className="pt-[3px] font-sans font-medium text-[11px] text-[#c4cadf] leading-[16.5px]">
                {error}
              </p>
              <button
                type="button"
                onClick={() => loadVersions(submissionId)}
                className="mt-[10px] h-[28px] px-[12px] rounded-[8px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-[8px] py-[18px]">
              <div className="size-[40px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
                <History
                  className="size-[18px] text-[#c4cadf]"
                  strokeWidth={1.75}
                />
              </div>
              <p className="pt-[8px] font-sans font-semibold text-[12.5px] text-[#8a93b4]">
                No versions yet
              </p>
              <p className="pt-[3px] font-sans font-medium text-[11px] text-[#c4cadf] leading-[16.5px]">
                Submissions of this chapter will appear here.
              </p>
            </div>
          ) : (
            versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => onOpenVersion(version)}
                title={`Open ${version.fileName} in workspace tab`}
                aria-label={`Open version ${version.version} (${version.fileName}) in workspace tab`}
                className={`w-full text-left px-[14px] py-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] focus-visible:ring-inset ${
                  version.isCurrent
                    ? 'bg-[#f8f9ff] hover:bg-[#f2f4ff]'
                    : 'bg-white hover:bg-[#fafbff]'
                }`}
              >
                <div className="flex items-center justify-between gap-[8px]">
                  <div className="flex items-center gap-[7px] min-w-px">
                    <span
                      className={`rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] shrink-0 ${
                        version.isCurrent
                          ? 'bg-[rgba(22,163,74,0.07)] border border-[rgba(22,163,74,0.2)] text-[#16a34a]'
                          : 'bg-[#f4f6ff] border border-[#e5e8ff] text-[#707dff]'
                      }`}
                    >
                      v{version.version}
                      {version.isCurrent ? ' · Current' : ''}
                    </span>
                    <p className="truncate font-sans font-semibold text-[12.5px] leading-[17px] text-[#3c4268]">
                      {version.fileName}
                    </p>
                  </div>
                  <span className="flex items-center gap-[5px] h-[26px] px-[10px] bg-white border border-[#e8ebf8] rounded-[7px] font-sans font-semibold text-[11px] text-[#5a6382] shrink-0">
                    <ExternalLink className="size-[11px]" />
                    Open
                  </span>
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
              </button>
            ))
          )}
        </div>
      </div>
    </WorkspacePanel>
  )
}