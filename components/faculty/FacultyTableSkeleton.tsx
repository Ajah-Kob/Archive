const BAR = 'bg-[#e8ebf8]'

export function FacultyTableSkeleton({ manageMode = true }: { manageMode?: boolean }) {
  const gridCols = manageMode
    ? 'grid-cols-[2fr_1fr_1fr_1fr_150px]'
    : 'grid-cols-[2fr_1fr_1fr_150px]'

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-pulse">
      {/* Header Row — font matches defense scheduling */}
      <div
        className={`grid ${gridCols} items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa]`}
      >
        <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
          Adviser
        </div>
        <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
          Activity
        </div>
        <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
          Workload
        </div>
        {manageMode && (
          <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
            Coordinator
          </div>
        )}
        <div />
      </div>

      {/* Skeleton rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`grid ${gridCols} items-center px-[20px] h-[63px] border-b border-[#f0f2fa]`}
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
          <div className="flex flex-col items-start gap-1.5 pr-4">
            <div className="flex gap-2 items-center">
              <div className={`h-[12px] w-[48px] rounded ${BAR}`} />
              <div className={`h-[5px] rounded-[3px] w-[120px] ${BAR}`} />
            </div>
            <div className={`h-[10px] w-[80px] rounded ${BAR}`} />
          </div>
          {manageMode && (
            <div className="pr-4">
              <div className={`h-[22px] w-[90px] rounded-full ${BAR}`} />
            </div>
          )}
          <div className="flex justify-end gap-[3px]">
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
            <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
          </div>
        </div>
      ))}
    </div>
  )
}
