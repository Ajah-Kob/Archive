const BAR = 'bg-[#e8ebf8]'
const GRID_COLS = 'grid-cols-[32px_2fr_1fr_1fr]'
/** Same chrome StudentsTable uses for its own panel, at both breakpoints. */
const PANEL =
  'bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]'

export function StudentTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full flex flex-col flex-1 min-h-full animate-pulse">
      {/* Mobile cards — StudentsTable owns the panel below sm, so this does too
          rather than borrowing one from loading.tsx. */}
      <div className="sm:hidden flex-1 min-h-0 overflow-y-auto">
        <div className={`${PANEL} p-3 flex flex-col gap-[10px]`}>
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-[12px] rounded-[12px] border border-[#eceef8] bg-white px-[12px] py-[12px]"
            >
              <div className={`size-4 mt-1 rounded shrink-0 ${BAR}`} />
              <div className="min-w-0 flex-1 flex flex-col gap-[10px]">
                <div className="flex items-center gap-[10px]">
                  <div className={`size-8 rounded-full shrink-0 ${BAR}`} />
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className={`h-[13px] w-32 rounded ${BAR}`} />
                    <div className={`h-[11px] w-44 rounded ${BAR}`} />
                  </div>
                </div>
                <div className="flex items-center gap-[14px]">
                  <div className={`h-[16px] w-[90px] rounded-full ${BAR}`} />
                  <div className={`h-[13px] w-[110px] rounded ${BAR}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: the same panel plus the original grid. */}
      <div
        className={`hidden sm:flex flex-col flex-1 min-h-full ${PANEL} overflow-hidden`}
      >
        {/* Header Row */}
        <div
          className={`grid ${GRID_COLS} items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa] rounded-t-[14px]`}
        >
          <div className={`size-4 rounded ${BAR}`} />
          <div className={`h-[11px] w-16 rounded ${BAR}`} />
          <div className={`h-[11px] w-20 rounded ${BAR}`} />
          <div className={`h-[11px] w-14 rounded ${BAR}`} />
        </div>

        {/* Skeleton rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={`grid ${GRID_COLS} items-center px-[20px] h-[63px] border-b border-[#f0f2fa] last:border-b-0`}
          >
            <div className={`size-4 rounded ${BAR}`} />
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
              <div className={`h-[13px] w-[110px] rounded ${BAR}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
