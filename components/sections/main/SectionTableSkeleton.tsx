'use client'

const BAR = 'bg-[#e8ebf8]'

/** Must stay in step with GRID_COLS in SectionTable, which drives the real rows. */
const GRID_COLS = 'grid-cols-[1.4fr_1fr_0.9fr_1.5fr_1fr_0.7fr_0.7fr_120px]'

export function SectionTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col min-h-0 overflow-hidden animate-pulse">
      {/* Mirrors SectionTable: the scroll strip and 960px floor live on the real
          table, so the skeleton has to carry both or the layout jumps on load. */}
      <div className="overflow-x-auto flex-1 flex flex-col min-h-0">
        <div className="min-w-[960px] flex-1 flex flex-col min-h-0">
          {/* Header Row — Section, Academic Year, Phase, Coordinator, Date Created, Students, Groups, Actions */}
          <div className={`grid ${GRID_COLS} items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa] rounded-t-[14px] shrink-0`}>
            <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Section
            </div>
            <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Academic Year
            </div>
            <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Phase
            </div>
            <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Coordinator
            </div>
            <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Date Created
            </div>
            <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Students
            </div>
            <div className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
              Groups
            </div>
            <div />
          </div>

          {/* Skeleton rows — matches SectionDataRow h-[63px] */}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className={`grid ${GRID_COLS} items-center px-[20px] h-[63px] border-b border-[#f0f2fa] last:border-b-0`}
            >
              {/* Section */}
              <div className="pr-4">
                <div className={`h-[13px] w-[120px] rounded ${BAR}`} />
              </div>

              {/* Academic Year */}
              <div className="pr-4">
                <div className={`h-[13px] w-[70px] rounded ${BAR}`} />
              </div>

              {/* Phase */}
              <div className="pr-4">
                <div className={`h-[16px] w-[90px] rounded-full ${BAR}`} />
              </div>

              {/* Coordinator — mirrors UserProfile skeleton */}
              <div className="flex gap-2.5 items-center min-w-0 pr-4">
                <div className={`size-8 rounded-full shrink-0 ${BAR}`} />
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className={`h-[13px] w-32 rounded ${BAR}`} />
                  <div className={`h-[11px] w-44 rounded ${BAR}`} />
                </div>
              </div>

              {/* Date Created */}
              <div className="pr-4">
                <div className={`h-[13px] w-[90px] rounded ${BAR}`} />
              </div>

              {/* Students */}
              <div className="pr-4 flex items-center gap-[6px]">
                <div className={`size-[11px] rounded-full ${BAR}`} />
                <div className={`h-[13px] w-[40px] rounded ${BAR}`} />
              </div>

              {/* Groups */}
              <div className="pr-4 flex items-center gap-[6px]">
                <div className={`size-[11px] rounded-full ${BAR}`} />
                <div className={`h-[13px] w-[40px] rounded ${BAR}`} />
              </div>

              {/* Action — 3 dots */}
              <div className="flex justify-end gap-[3px]">
                <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
                <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
                <div className="size-[4px] rounded-full bg-[#e8ebf8]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
