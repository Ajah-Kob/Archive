function LinkRowSkeleton() {
  return (
    <div className="rounded-[10px] bg-[#fafbff] border border-[#eceef8] p-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="w-full min-w-0 flex flex-col gap-2">
          <div className="h-[13px] w-[150px] rounded bg-slate-200" />
          <div className="h-[12px] w-[70%] rounded bg-[#e8ebf8]" />
          <div className="h-[11px] w-[45%] rounded bg-[#e8ebf8]" />
        </div>
        <div className="h-[32px] w-[88px] rounded-[8px] bg-white border border-[#e0e3f0] shrink-0" />
      </div>
    </div>
  )
}

function LinksCardSkeleton() {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="border-[#f0f2fa] border-b w-full shrink-0">
        <div className="flex items-center gap-2 p-4">
          <div className="h-[13px] w-[110px] rounded bg-slate-200" />
          <div className="h-[20px] w-[28px] rounded-full bg-[#e8ebf8]" />
        </div>
      </div>
      <div className="p-[14px] flex flex-col gap-[14px]">
        <LinkRowSkeleton />
        <LinkRowSkeleton />
        <div className="rounded-[8px] border-2 border-dashed border-[#dfe3fb] py-1.5 px-3.5 bg-[#f7f8ff] flex justify-center">
          <div className="h-[20px] w-[96px] rounded bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

function CommentRowSkeleton() {
  return (
    <div className="rounded-[10px] bg-[#f7f8ff] border border-[#eef0f8] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="size-5 rounded-full bg-slate-200 shrink-0" />
        <div className="h-[12px] w-[110px] rounded bg-slate-200" />
        <div className="h-[11px] w-[64px] rounded bg-[#e8ebf8]" />
      </div>
      <div className="mt-1.5 flex flex-col gap-1.5">
        <div className="h-[12px] w-full rounded bg-[#e8ebf8]" />
        <div className="h-[12px] w-[70%] rounded bg-[#e8ebf8]" />
      </div>
    </div>
  )
}

function CommentsCardSkeleton() {
  return (
    <div className="rounded-[14px] border border-[#e4e7fb] bg-white shadow-[0_2px_12px_rgba(112,125,255,0.04)]">
      <div className="flex items-center gap-2 border-b border-[#eef0f8] p-4">
        <div className="h-[13px] w-[140px] rounded bg-slate-200" />
        <div className="h-[20px] w-[28px] rounded-full bg-[#e8ebf8]" />
      </div>
      <div className="p-4 flex flex-col gap-2.5">
        <CommentRowSkeleton />
        <CommentRowSkeleton />
      </div>
    </div>
  )
}

export default function StudentSystemLoading() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-[30px] sm:px-8 animate-pulse">
      <div className="flex flex-col gap-5">
        <LinksCardSkeleton />
        <CommentsCardSkeleton />
        <CommentsCardSkeleton />
      </div>
    </div>
  )
}
