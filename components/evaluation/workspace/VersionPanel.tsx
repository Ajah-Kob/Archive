'use client'

import { useRouter } from 'next/navigation'
import { History } from 'lucide-react'
import { SubmissionStatusBadge } from '@/components/milestones/chapter/SubmissionStatusBadge'
import { WorkspacePanel } from '@/components/evaluation/workspace/WorkspacePanel'
import type { StudentVersionListItem } from '@/lib/actions/student-review'

interface VersionPanelProps {
  /** All versions of the chapter, latest first. */
  versions: StudentVersionListItem[]
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Student Version panel — lists every version of the chapter with its own
 * status. Clicking a version opens that version's read-only workspace in a
 * NEW browser tab (one version per tab, matching the adviser architecture).
 * Every version is read-only for students regardless of which is opened —
 * the mode comes from the route, never from the row.
 */
export function VersionPanel({ versions, onClose }: VersionPanelProps) {
  const router = useRouter()

  return (
    <WorkspacePanel
      title="Versions"
      subtitle="Every version of this chapter. Each opens read-only in a new tab."
      count={versions.length}
      onClose={onClose}
    >
      {versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-[8px] py-[24px]">
          <div className="size-[40px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
            <History className="size-[18px] text-[#c4cadf]" strokeWidth={1.75} />
          </div>
          <p className="pt-[8px] font-sans font-semibold text-[12.5px] text-[#8a93b4]">
            No previous versions
          </p>
          <p className="pt-[3px] font-sans font-medium text-[11px] text-[#c4cadf] leading-[16.5px]">
            Resubmissions of this chapter will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {versions.map((version) => (
            <button
              key={version.id}
              type="button"
              onClick={() =>
                window.open(`/student/milestone/review/${version.id}`, '_blank', 'noopener')
              }
              className={`flex items-center justify-between gap-[8px] px-[14px] py-[11px] text-left transition-colors hover:bg-[#fafbff] ${
                version.isCurrent ? 'bg-[#f8f9ff]' : ''
              }`}
            >
              <span className="flex items-center gap-[7px] min-w-px">
                <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff] shrink-0">
                  v{version.version}
                </span>
                <span className="truncate font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                  {formatDate(version.submittedAt)}
                  {version.isCurrent && (
                    <span className="text-[#707dff] font-semibold"> · Current</span>
                  )}
                </span>
              </span>
              <SubmissionStatusBadge status={version.status} />
            </button>
          ))}
        </div>
      )}
    </WorkspacePanel>
  )
}
