'use client'

function VerdictCalloutSkeleton() {
  return (
    <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:gap-[16px] rounded-[14px] border border-[#e8ebf8] bg-white px-[18px] py-[16px] sm:px-[22px] sm:py-[18px]">
      <div className="flex items-center gap-[12px] sm:gap-[16px] min-w-0 flex-1">
        <div className="size-[40px] rounded-[12px] bg-slate-200 shrink-0" />
        <div className="min-w-0 flex-1 flex flex-col gap-[7px]">
          <div className="h-[14px] w-[170px] rounded bg-slate-200" />
          <div className="h-[12px] w-[75%] max-w-[360px] rounded bg-slate-200" />
        </div>
      </div>
      <div className="h-[36px] w-full sm:w-[128px] rounded-[9px] bg-slate-200 shrink-0" />
    </div>
  )
}

function LatestDocumentSkeleton() {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center gap-[8px] px-[16px] pt-[12px] pb-[13px] border-b border-[#f0f2fa]">
        <div className="size-[26px] rounded-[7px] bg-slate-200 shrink-0" />
        <div className="h-[12px] w-[118px] rounded bg-slate-200" />
      </div>
      <div className="p-[14px] flex flex-col gap-[14px]">
        <div className="flex gap-[14px] items-start">
          <div className="size-[15px] rounded-full bg-slate-200 shrink-0 mt-[2px]" />
          <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
            <div className="h-[13px] w-[58%] rounded bg-slate-200" />
            <div className="h-[12px] w-[72%] rounded bg-[#e8ebf8]" />
            <div className="h-[11px] w-[38%] rounded bg-[#e8ebf8]" />
          </div>
          <div className="hidden sm:flex gap-[10px] shrink-0">
            <div className="h-[32px] w-[74px] rounded-[8px] bg-slate-200" />
            <div className="h-[32px] w-[96px] rounded-[8px] bg-[#e8ebf8]" />
          </div>
        </div>
        <div className="flex sm:hidden gap-[10px]">
          <div className="h-[32px] flex-1 rounded-[8px] bg-slate-200" />
          <div className="h-[32px] flex-1 rounded-[8px] bg-[#e8ebf8]" />
        </div>
      </div>
    </div>
  )
}

function DetailsCardSkeleton() {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] drop-shadow-[0px_2px_6px_rgba(112,125,255,0.05)] flex flex-col lg:flex-row gap-0 px-[16px] py-[8px]">
      <div className="w-full lg:w-[197px] p-[10px] shrink-0 flex flex-col gap-[7px]">
        <div className="h-[20px] w-[132px] rounded bg-slate-200" />
        <div className="h-[12px] w-[84px] rounded bg-[#e8ebf8]" />
      </div>
      <div className="flex-1 flex flex-wrap gap-[15px] p-[10px] items-center min-w-0">
        <div className="flex items-center gap-[6px]">
          <div className="size-[11px] rounded bg-slate-200" />
          <div className="h-[12px] w-[110px] rounded bg-[#e8ebf8]" />
        </div>
        <div className="flex items-center gap-[6px]">
          <div className="size-[11px] rounded bg-slate-200" />
          <div className="h-[12px] w-[88px] rounded bg-[#e8ebf8]" />
        </div>
        <div className="flex items-center gap-[6px]">
          <div className="size-[11px] rounded bg-slate-200" />
          <div className="h-[12px] w-[70px] rounded bg-[#e8ebf8]" />
        </div>
      </div>
      <div className="hidden lg:flex w-[162px] shrink-0 items-center justify-end">
        <div className="h-[26px] w-[110px] rounded-[8px] bg-slate-200" />
      </div>
    </div>
  )
}

function DefenseDetailsSkeleton() {
  return (
    <div className="bg-white border border-[#e8ebf8] flex flex-col items-start overflow-clip p-px rounded-[14px] w-full shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] max-h-[520px]">
      <div className="border-[#f0f2fa] border-b w-full shrink-0">
        <div className="flex items-center px-[18px] pt-[15px] pb-[16px] w-full">
          <div className="h-[12px] w-[96px] rounded bg-slate-200" />
        </div>
      </div>
      <div className="flex flex-col gap-[20px] w-full p-[16px] max-h-[460px] overflow-hidden">
        <div className="flex flex-col gap-[10px] self-stretch min-w-0">
          <div className="h-[12px] w-[56px] rounded bg-[#e8ebf8]" />
          <DetailsCardSkeleton />
        </div>
        <div className="flex flex-col gap-[10px] self-stretch">
          <div className="h-[12px] w-[72px] rounded bg-[#e8ebf8]" />
          <div className="grid gap-[8px] sm:grid-cols-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-[10px] rounded-[10px] border border-[#e8ebf8] bg-[#fafbff] px-[12px] py-[10px]"
              >
                <div className="size-[32px] rounded-full bg-slate-200 shrink-0" />
                <div className="min-w-0 flex-1 flex flex-col gap-[5px]">
                  <div className="h-[12px] w-[62%] rounded bg-slate-200" />
                  <div className="h-[11px] w-[78%] rounded bg-[#e8ebf8]" />
                </div>
                <div className="h-[22px] w-[64px] rounded-full bg-slate-200 shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[10px] self-stretch">
          <div className="h-[12px] w-[68px] rounded bg-[#e8ebf8]" />
          <div className="grid gap-[8px] sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex items-center gap-[10px] rounded-[10px] border border-[#e8ebf8] bg-white px-[12px] py-[10px]"
              >
                <div className="size-[28px] rounded-full bg-slate-200 shrink-0" />
                <div className="min-w-0 flex-1 flex flex-col gap-[5px]">
                  <div className="h-[12px] w-[58%] rounded bg-slate-200" />
                  <div className="h-[11px] w-[48%] rounded bg-[#e8ebf8]" />
                </div>
                <div className="h-[20px] w-[48px] rounded-full bg-[#e8ebf8] shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ContextBarSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[10px] px-8 py-[10px] bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
      {/* Left: Session / Resubmission tabs h-[40px] */}
      <div className="flex items-center gap-1 min-w-0">
        <div className="relative flex items-center h-[40px] px-[14px] shrink-0">
          <div className="h-[13px] w-[56px] rounded bg-slate-200" />
          <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center h-[40px] px-[14px] shrink-0">
          <div className="h-[13px] w-[98px] rounded bg-[#e8ebf8]" />
        </div>
      </div>
      {/* Right: Document History + Back after it */}
      <div className="flex items-center gap-[8px] shrink-0">
        <div className="h-[30px] w-[148px] rounded-[9px] bg-white border border-[rgba(112,125,255,0.19)] shadow-sm" />
        <div className="h-[30px] w-[72px] rounded-[9px] bg-white border border-[rgba(112,125,255,0.19)] shadow-sm" />
      </div>
    </div>
  )
}

export function DefenseSessionSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden animate-pulse">
      <ContextBarSkeleton />
      <div className="flex-1 min-h-0 overflow-y-auto p-[30px] flex flex-col overscroll-contain">
        <div className="flex flex-col gap-[16px] w-full mx-auto">
          <VerdictCalloutSkeleton />
          <LatestDocumentSkeleton />
          <DefenseDetailsSkeleton />
        </div>
      </div>
    </div>
  )
}
