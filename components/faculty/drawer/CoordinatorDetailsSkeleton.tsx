export function CoordinatorDetailsSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      {/* Profile card */}
      <div className="flex items-center gap-[16px] py-[24px] border-b border-[#f0f2fa]">
        <div className="size-14 rounded-full bg-slate-200 shrink-0" />
        <div className="flex flex-col gap-[6px] flex-1 min-w-0">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="h-3 w-52 rounded bg-slate-200" />
          <div className="h-4 w-24 rounded-full bg-slate-200" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 pt-[24px]">
        <div className="h-[76px] rounded-[12px] bg-slate-100 border border-[#eceef8]" />
        <div className="h-[76px] rounded-[12px] bg-slate-100 border border-[#eceef8]" />
      </div>

      {/* Handled sections */}
      <div className="flex flex-col gap-[16px] pt-[24px]">
        <div className="h-5 w-[170px] rounded bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-[12px] bg-[#f8f9fe] border border-[#eceef8] rounded-[12px] px-[14px] py-[12px]"
          >
            <div className="size-9 rounded-[10px] bg-slate-200 shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="h-3.5 w-32 rounded bg-slate-200" />
              <div className="h-3 w-24 rounded bg-slate-200" />
            </div>
            <div className="h-[22px] w-[72px] rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  )
}
