const BAR = 'bg-[#e8ebf8]'

function PhaseCard({ rows }: { rows: number }) {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex flex-col min-w-0 overflow-hidden">
      <div className="px-5 py-[12px] border-b border-[#f0f2fa] flex items-center justify-between gap-3">
        <div className={`h-[13px] w-28 rounded ${BAR}`} />
        <span className="flex items-center gap-2 shrink-0">
          <div className={`h-[16px] w-[90px] rounded-full ${BAR}`} />
          <div className={`h-[28px] w-[76px] rounded-[9px] ${BAR}`} />
        </span>
      </div>
      <div className="flex flex-col py-[4px]">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-[10px] px-5 py-[8px]"
          >
            <div className={`h-[12px] w-36 rounded ${BAR}`} />
            <span className="flex items-center gap-[10px] shrink-0">
              <div className={`h-[16px] w-[64px] rounded-full ${BAR}`} />
              <div className={`size-[26px] rounded-[7px] ${BAR}`} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MilestonesTabSkeleton() {
  return (
    <div className="flex flex-col gap-[16px] flex-1 min-h-0 animate-pulse">
      <PhaseCard rows={6} />
      <PhaseCard rows={4} />
    </div>
  )
}
