'use client'

function CalloutSkeleton() {
  return (
    <div className="flex items-center gap-[16px] rounded-[14px] border border-[#eceef8] bg-white px-[22px] py-[18px] animate-pulse">
      <div className="size-[40px] rounded-[12px] bg-slate-200 shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
        <div className="h-[15px] w-[160px] rounded bg-slate-200" />
        <div className="h-[13px] w-[75%] rounded bg-[#e8ebf8]" />
      </div>
      <div className="h-[36px] w-[140px] rounded-[9px] bg-slate-200 shrink-0 hidden sm:block" />
    </div>
  )
}

function DocumentCardSkeleton() {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_rgba(30,58,138,0.06)] overflow-hidden animate-pulse">
      <div className="flex items-center gap-[8px] px-[16px] pt-[12px] pb-[13px] border-b border-[#f0f2fa]">
        <div className="size-[26px] rounded-[7px] bg-slate-200 shrink-0" />
        <div className="h-[12px] w-[140px] rounded bg-slate-200" />
      </div>
      <div className="p-[14px] flex flex-col gap-[14px]">
        <div className="flex gap-[14px] items-start">
          <div className="size-[15px] rounded-full bg-slate-200 shrink-0 mt-[2px]" />
          <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
            <div className="h-[13px] w-[45%] rounded bg-slate-200" />
            <div className="h-[12px] w-[70%] rounded bg-slate-200" />
            <div className="h-[12px] w-[50%] rounded bg-[#e8ebf8]" />
          </div>
          <div className="h-[32px] w-[130px] rounded-[8px] bg-slate-200 shrink-0" />
        </div>
      </div>
    </div>
  )
}

function DetailsCardSkeleton() {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_rgba(30,58,138,0.06)] p-5 animate-pulse">
      <div className="h-[14px] w-[120px] rounded bg-slate-200 mb-4" />
      <div className="flex flex-col gap-3">
        <div className="h-[13px] w-full rounded bg-[#eef0f7]" />
        <div className="h-[13px] w-[85%] rounded bg-[#eef0f7]" />
        <div className="flex gap-2 mt-2">
          <div className="size-[36px] rounded-full bg-slate-200" />
          <div className="size-[36px] rounded-full bg-slate-200" />
          <div className="size-[36px] rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

export function SessionTabSkeleton() {
  return (
    <div className="flex flex-col gap-[16px] w-full mx-auto">
      <CalloutSkeleton />
      <DocumentCardSkeleton />
      <DetailsCardSkeleton />
    </div>
  )
}

export default SessionTabSkeleton
