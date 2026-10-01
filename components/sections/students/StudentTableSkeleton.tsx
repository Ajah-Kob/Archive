const BAR = 'bg-[#e8ebf8]'
const GRID_COLS = 'grid-cols-[32px_2fr_1fr_1fr]'

export function StudentTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full flex flex-col flex-1 min-h-full animate-pulse">
      {/* Mobile cards — the real StudentsTable renders cards below sm. */}
      <div className="sm:hidden flex flex-col gap-[10px] p-3">
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

      {/* Desktop: the original grid. */}
      <div className="hidden sm:flex flex-col flex-1 min-h-full">
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
