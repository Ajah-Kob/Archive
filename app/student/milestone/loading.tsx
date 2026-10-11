function MilestoneCardSkeleton() {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] p-5 flex flex-col gap-2 flex-1 min-w-0 shadow-[0_2px_12px_rgba(30,58,138,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="h-[15px] w-[140px] rounded bg-slate-200" />
        <div className="h-[21px] w-[86px] rounded-[7px] bg-[#e8ebf8] border border-[#e8ebf8] shrink-0" />
      </div>
      <div className="h-[12px] w-[85%] rounded bg-[#e8ebf8]" />
      <div className="h-[12px] w-[60%] rounded bg-[#e8ebf8]" />
    </div>
  )
}

function PhaseSkeleton({ headerWidth }: { headerWidth: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full bg-[#eef0f6]">
        <div className="flex items-center py-2 pl-[46px] pr-4 sm:px-12">
          <div className={`h-[15px] rounded bg-slate-200 ${headerWidth}`} />
        </div>
      </div>
      <div className="relative flex flex-col gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="relative z-10 flex items-start gap-4">
            <div className="flex w-[30px] shrink-0 justify-center pt-5">
              <div className="size-[30px] rounded-full bg-[#e8ebf8] shrink-0" />
            </div>
            <MilestoneCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MilestoneLoading() {
  return (
    <section className="h-full flex min-h-0 relative">
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8">
          <div className="min-h-full animate-pulse">
            <div className="z-0 flex min-w-0 flex-col gap-4">
              <div className="relative flex min-w-0 flex-col gap-4">
                <div
                  aria-hidden
                  className="absolute left-0 top-0 bottom-0 w-[30px] rounded-full bg-white"
                />
                <PhaseSkeleton headerWidth="w-[104px]" />
                <PhaseSkeleton headerWidth="w-[108px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
