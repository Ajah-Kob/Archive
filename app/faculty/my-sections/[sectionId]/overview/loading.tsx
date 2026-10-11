const BAR = 'bg-[#e8ebf8]'

function ActivityFeedSkeleton() {
  return (
    <div className="rounded-[14px] border border-[#eceef8] bg-white p-5 shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="h-[14px] w-24 rounded bg-slate-200" />
      <ol className="mt-3 flex flex-col">
        {[0, 1, 2, 3].map((i, _, arr) => (
          <li key={i} className="flex gap-[12px]">
            <div className="flex flex-col items-center self-stretch shrink-0 pt-[2px]">
              <div className="size-[28px] rounded-full bg-slate-200 border border-[#eceef8] shrink-0" />
              {i === arr.length - 1 ? null : (
                <span className="w-px flex-1 min-h-[20px] bg-[#eceef8]" aria-hidden="true" />
              )}
            </div>
            <div className={`min-w-0 flex-1 flex flex-col gap-[6px] pt-[4px] ${i === arr.length - 1 ? 'pb-0' : 'pb-[16px]'}`}>
              <div className="h-[12px] w-[70%] rounded bg-slate-200" />
              <div className={`h-[11px] w-24 rounded ${BAR}`} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function SectionOverviewLoading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full animate-pulse">
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col items-start pb-[15px] pt-[20px] px-[20px] w-full">
          <div className={`h-[20px] w-48 rounded ${BAR}`} />
        </div>
        <div className="px-[20px] py-[15px] flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <div className={`h-[13px] w-32 rounded ${BAR}`} />
          <div className={`h-[13px] w-36 rounded ${BAR}`} />
        </div>
      </div>
      <ActivityFeedSkeleton />
    </div>
  )
}
