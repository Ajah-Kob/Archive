import { Lock, Plus } from 'lucide-react'

interface SummaryCardProps {
  count: number
  cap: number
  hasApproved: boolean
  canSubmit: boolean
  onOpenSubmit: () => void
}

export function SummaryCard({
  count,
  cap,
  hasApproved,
  canSubmit,
  onOpenSubmit,
}: SummaryCardProps) {
  const pct = Math.min(100, Math.round((count / Math.max(1, cap)) * 100))

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-[6px]">
          <p className="font-heading font-bold text-[24px] leading-none text-[#10133a] tracking-[-0.24px]">
            {count}
          </p>
          <p className="font-sans font-medium text-[13.5px] leading-[22px] text-[#9ea8c6] pb-px">
            / {cap} Submitted
          </p>
        </div>
        {canSubmit && (
          <button
            onClick={onOpenSubmit}
            className="flex gap-[7px] items-center h-[36px] px-[16px] rounded-[9px] text-[12.5px] font-semibold text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] hover:opacity-95 transition-opacity"
            style={{
              backgroundImage: 'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
            }}
          >
            <Plus className="size-[13px]" />
            Submit Topic
          </button>
        )}
      </div>

      <div className="mt-[16px] h-[8px] rounded-full bg-[#f0f2fa] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundImage: 'linear-gradient(90deg, #707dff 0%, #5565ff 100%)',
          }}
        />
      </div>

      {!canSubmit ? (
        <p className="flex items-center gap-[6px] pt-[12px] font-sans font-medium text-[11.5px] text-[#8a93b4]">
          <Lock className="size-[12px] text-[#9ea8c6]" />
          {hasApproved
            ? 'Submissions are locked — a topic has been approved.'
            : `All ${cap} topics have been submitted.`}
        </p>
      ) : (
        <p className="pt-[12px] font-sans font-medium text-[11.5px] text-[#8a93b4]">
          {count < cap
            ? `You can submit ${cap - count} more topic${
                cap - count === 1 ? '' : 's'
              }.`
            : 'You can submit another topic.'}
        </p>
      )}
    </div>
  )
}
