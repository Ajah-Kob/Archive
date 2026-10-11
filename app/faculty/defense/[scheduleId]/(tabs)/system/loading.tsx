function SystemLinksSkeleton() {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="border-[#f0f2fa] border-b w-full shrink-0">
        <div className="flex items-center gap-2 p-4">
          <div className="h-[13px] w-[100px] rounded bg-slate-200" />
          <div className="h-[18px] w-[28px] rounded-full bg-[#eef2ff]" />
        </div>
      </div>
      <div className="p-[14px] flex flex-col gap-[14px]">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-[10px] bg-[#fafbff] border border-[#eceef8] p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="w-full min-w-0 flex flex-col gap-[6px]">
                <div className="h-[13px] w-[45%] rounded bg-slate-200" />
                <div className="h-[12px] w-[70%] rounded bg-[#e8ebf8]" />
                <div className="h-[11px] w-[35%] rounded bg-[#e8ebf8]" />
              </div>
              <div className="h-[32px] w-[76px] rounded-[8px] bg-slate-200 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemCommentsSkeleton() {
  return (
    <div className="rounded-[14px] border border-[#e4e7fb] bg-white shadow-[0_2px_12px_rgba(112,125,255,0.04)]">
      <div className="flex items-center border-b border-[#eef0f8]">
        <div className="flex items-center gap-2 p-4">
          <div className="h-[13px] w-[140px] rounded bg-slate-200" />
          <div className="h-[18px] w-[28px] rounded-full bg-[#eef2ff]" />
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2.5">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-[10px] bg-[#f7f8ff] border border-[#eef0f8] p-3">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-slate-200 shrink-0" />
              <div className="h-[12px] w-[90px] rounded bg-slate-200" />
              <div className="h-[11px] w-[60px] rounded bg-[#e8ebf8]" />
            </div>
            <div className="mt-1.5 flex flex-col gap-[6px]">
              <div className="h-[12px] w-full rounded bg-[#e8ebf8]" />
              <div className="h-[12px] w-[70%] rounded bg-[#e8ebf8]" />
            </div>
          </div>
        ))}
        <div className="rounded-[8px] border-2 border-dashed border-[#dfe3fb] py-1.5 px-3.5 bg-[#f7f8ff] flex justify-center">
          <div className="h-[13px] w-[100px] rounded bg-[#e8ebf8]" />
        </div>
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <SystemLinksSkeleton />
      <SystemCommentsSkeleton />
      <SystemCommentsSkeleton />
    </div>
  )
}
