import { DefenseDocumentSkeleton } from '@/components/milestones/defense/DefenseDocumentSkeleton'

function StatusCalloutSkeleton() {
  return (
    <div className="flex items-center gap-[16px] rounded-[14px] border border-[#eceef8] bg-white px-[22px] py-[18px]">
      <div className="size-[40px] rounded-[12px] bg-slate-200 shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
        <div className="h-[15px] w-[160px] rounded bg-slate-200" />
        <div className="h-[13px] w-[75%] rounded bg-[#e8ebf8]" />
      </div>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center gap-[8px] px-[16px] pt-[12px] pb-[13px] border-b border-[#f0f2fa]">
        <div className="size-[26px] rounded-[7px] bg-slate-200 shrink-0" />
        <div className="h-[12px] w-[130px] rounded bg-slate-200" />
      </div>
      <div className="p-[14px] flex flex-col gap-[14px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-[14px] items-start">
            <div className="size-[15px] rounded-full bg-slate-200 shrink-0 mt-[2px]" />
            <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
              <div className="flex items-center gap-2">
                <div className="h-[13px] w-[110px] rounded bg-slate-200" />
                <div className="h-[20px] w-[70px] rounded-full bg-[#e8ebf8] shrink-0" />
              </div>
              <div className="h-[12px] w-[55%] rounded bg-[#e8ebf8]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MilestoneLoading() {
  return (
    <section className="h-full flex min-h-0">
      <div className="hidden lg:flex w-[200px] shrink-0 bg-white shadow-[0px_2px_12px_rgba(30,58,138,0.06)] flex-col gap-[12px] px-[13px] py-[26px] animate-pulse">
        <div className="h-[13px] w-[120px] rounded bg-[#e8ebf8]" />
        <div className="flex flex-col gap-[16px] flex-1">
          <div className="h-[10px] w-[70px] rounded bg-[#e8ebf8]" />
          <div className="h-[50px] w-full rounded-[9px] bg-[#e8ebf8]" />
          <div className="h-[50px] w-full rounded-[9px] bg-[#e8ebf8]" />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* MilestoneHeader strip — chapter pages show no tabs, Back only. */}
        <div className="flex flex-nowrap items-center justify-between gap-x-[16px] px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px] animate-pulse">
          <div className="flex-1" />
          <div className="h-[10px] w-[38px] shrink-0 rounded bg-[#e8ebf8]" />
        </div>
        <div className="flex-1 min-h-0 px-4 sm:px-8 py-[30px] flex flex-col overflow-hidden animate-pulse">
          <div className="flex min-h-0 flex-1 flex-col gap-[16px]">
            <StatusCalloutSkeleton />
            <DefenseDocumentSkeleton />
            <HistorySkeleton />
          </div>
        </div>
      </div>
    </section>
  )
}
