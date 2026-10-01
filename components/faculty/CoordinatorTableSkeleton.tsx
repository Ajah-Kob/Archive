const BAR = 'bg-[#e8ebf8]'

const GRID_TEMPLATE_COLUMNS = '1fr 140px 110px 60px'

export function CoordinatorTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 animate-pulse">
      {/* Mobile cards — the real CoordinatorTable renders cards below sm. */}
      <div className="sm:hidden flex flex-col gap-[10px] p-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex flex-col gap-[10px] rounded-[12px] border border-[#eceef8] bg-white px-[12px] py-[12px]">
            <div className="flex items-center gap-[10px]">
              <div className={`size-8 rounded-full shrink-0 ${BAR}`} />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className={`h-[13px] w-32 rounded ${BAR}`} />
                <div className={`h-[11px] w-44 rounded ${BAR}`} />
              </div>
            </div>
            <div className="flex items-center gap-[14px]">
              <div className={`h-[16px] w-[70px] rounded-full ${BAR}`} />
              <div className={`h-[16px] w-[90px] rounded-full ${BAR}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: the original grid. */}
      <div className="hidden sm:flex flex-col flex-1 min-h-0">
      {/* Header Row — matches CoordinatorTable */}
      <div
        className="grid items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa]"
        style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}
      >
        <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
          Name
        </div>
        <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
          Activity
        </div>
        <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
          Sections
        </div>
        <div />
      </div>

      {/* Skeleton rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid items-center px-[20px] h-[63px] border-b border-[#f0f2fa]"
          style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}
        >
          <div className="flex gap-2.5 items-center min-w-0 pr-4">
            <div className={`size-8 rounded-full shrink-0 ${BAR}`} />
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className={`h-[13px] w-32 rounded ${BAR}`} />
              <div className={`h-[11px] w-44 rounded ${BAR}`} />
            </div>
          </div>
          <div className="pr-4">
            <div className={`h-[16px] w-[90px] rounded-full ${BAR}`} />
          </div>
          <div className="pr-4">
            <div className={`h-[22px] w-[90px] rounded-full ${BAR}`} />
          </div>
          <div className="flex justify-end gap-[3px]">
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}
