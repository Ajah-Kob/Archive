const BAR = 'bg-[#e8ebf8]'
const GRID_COLS = 'grid-cols-[1.4fr_0.8fr_1fr_1.6fr]'

export function ProgressTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 animate-pulse">
      {/* Title Row */}
      <div className="flex items-center gap-2.5 px-5 py-[14px] border-b border-[#f0f2fa] shrink-0">
        <div className={`h-[14px] w-32 rounded ${BAR}`} />
        <div className={`h-[12px] w-16 rounded ${BAR}`} />
      </div>

      {/* Header Row */}
      <div
        className={`grid ${GRID_COLS} items-center px-[20px] h-[40px] border-b border-[#f0f2fa] bg-[#fafbff]`}
      >
        {[64, 72, 56, 64].map((width, i) => (
          <div
            key={i}
            className={`h-[11px] rounded ${BAR}`}
            style={{ width }}
          />
        ))}
      </div>

      {/* Skeleton rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`grid ${GRID_COLS} items-center px-[20px] h-[58px] border-b border-[#f0f2fa] last:border-b-0`}
        >
          <div className="flex flex-col gap-1.5 min-w-0 pr-4">
            <div className={`h-[13px] w-28 rounded ${BAR}`} />
            <div className={`h-[11px] w-20 rounded ${BAR}`} />
          </div>
          <div className="pr-4">
            <div className={`h-[12px] w-6 rounded ${BAR}`} />
          </div>
          <div className="pr-4">
            <div className={`h-[12px] w-32 rounded ${BAR}`} />
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }).map((_, j) => (
              <div key={j} className={`size-3.5 rounded-full shrink-0 ${BAR}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
