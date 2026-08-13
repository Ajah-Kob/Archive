import { CalendarDays, TriangleAlert, UserRound } from 'lucide-react'
import type { TopicSubmissionItem } from '@/types/milestones'
import { Modal } from './Modal'
import { TopicStatusBadge } from './TopicStatusBadge'

interface TopicDetailModalProps {
  item: TopicSubmissionItem
  onClose: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TopicDetailModal({ item, onClose }: TopicDetailModalProps) {
  const needsRevision = item.status === 'NEED_REVISION'

  return (
    <Modal
      title={`Topic ${item.index} — Version ${item.version}`}
      subtitle="Submitted topic details"
      onClose={onClose}
      width={560}
    >
      <div className="flex items-center justify-between">
        <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff]">
          v{item.version}
        </span>
        <TopicStatusBadge status={item.status} />
      </div>

      <div className="flex flex-col gap-[6px]">
        <p className="font-sans font-semibold text-[15px] leading-[20px] text-[#10133a]">
          {item.title}
        </p>
        <p className="font-sans font-medium text-[13px] leading-[19.5px] text-[#6b7399]">
          {item.background}
        </p>
      </div>

      <div className="flex flex-col gap-[10px] border-t border-[#f4f5fc] pt-[14px]">
        <div className="flex items-center gap-[8px]">
          <UserRound className="size-[13px] text-[#9ea8c6]" strokeWidth={1.75} />
          <p className="font-sans font-medium text-[12px] text-[#5a6382]">
            Submitted by{' '}
            <span className="font-semibold text-[#3c4268]">
              {item.submittedBy ?? 'Unknown'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-[8px]">
          <CalendarDays className="size-[13px] text-[#9ea8c6]" strokeWidth={1.75} />
          <p className="font-sans font-medium text-[12px] text-[#5a6382]">
            Submitted {formatDate(item.createdAt)}
          </p>
        </div>
      </div>

      {item.reviewNote && (
        <div
          className={`rounded-[12px] p-[14px] flex flex-col gap-[8px] ${
            needsRevision
              ? 'bg-[rgba(225,29,72,0.04)] border border-[rgba(225,29,72,0.16)]'
              : 'bg-[rgba(112,125,255,0.04)] border border-[rgba(112,125,255,0.16)]'
          }`}
        >
          <p
            className={`font-sans font-bold text-[10.5px] leading-[15.75px] tracking-[0.6px] uppercase ${
              needsRevision ? 'text-[#e11d48]' : 'text-[#707dff]'
            }`}
          >
            Coordinator Feedback
          </p>
          <div className="flex gap-[7px] items-start">
            <TriangleAlert
              className={`size-[13px] shrink-0 mt-px ${
                needsRevision ? 'text-[#e11d48]' : 'text-[#707dff]'
              }`}
            />
            <p
              className={`font-medium text-[12px] leading-[17.4px] ${
                needsRevision ? 'text-[#e11d48]' : 'text-[#3c4268]'
              }`}
            >
              {item.reviewNote}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="bg-white border border-[#e8ebf8] rounded-[9px] h-[38px] px-[20px] text-[#5a6382] font-semibold text-[11px] hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
