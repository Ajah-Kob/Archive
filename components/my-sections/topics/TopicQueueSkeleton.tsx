const BAR = 'bg-[#e8ebf8]'
const GRID_COLS = 'grid-cols-[0.5fr_2fr_0.5fr_0.3fr_0.3fr]'

export function TopicQueueSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 animate-pulse">
      {/* Toolbar */}
      <div className="flex items-center gap-2.5 p-5 border-b border-[#f0f2fa] shrink-0">
        <div className={`h-[37.5px] w-[320px] max-w-[320px] min-w-[180px] rounded-lg ${BAR}`} />
        <div className={`h-[37.5px] w-[148px] rounded-lg ${BAR}`} />
      </div>

      {/* Header Row */}
      <div
        className={`grid ${GRID_COLS} items-center px-[20px] h-[40px] border-b border-[#f0f2fa] bg-[#fafbff]`}
      >
        {[64, 56, 96, 48].map((width, i) => (
          <div
            key={i}
            className={`h-[11px] rounded ${BAR}`}
            style={{ width }}
          />
        ))}
        <span />
      </div>

      {/* Skeleton rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`w-full grid ${GRID_COLS} items-center px-[20px] h-[58px] border-b border-[#f0f2fa] last:border-b-0`}
        >
          <div className="pr-4">
            <div className={`h-[13px] w-24 rounded ${BAR}`} />
          </div>
          <div className="pr-4">
            <div className={`h-[12px] w-48 max-w-full rounded ${BAR}`} />
          </div>
          <div className="pr-4">
            <div className={`h-[12px] w-28 rounded ${BAR}`} />
          </div>
          <div className="pr-4">
            <div className={`h-[12px] w-20 rounded ${BAR}`} />
          </div>
          <div className="flex items-center justify-end gap-[6px]">
            <div className={`size-[30px] rounded-[8px] ${BAR}`} />
            <div className={`size-[30px] rounded-[8px] ${BAR}`} />
          </div>
        </div>
      ))}
    </div>
  )
}
