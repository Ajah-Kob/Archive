export function DrawerSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      {/* Assigned Coordinators section */}
      <div className="flex flex-col gap-2 py-5 items-start w-full">
        <div className="flex items-center gap-2 pb-1">
          <div className="h-5 w-[170px] rounded bg-slate-200" />
          <div className="h-5 w-8 rounded-[20px] bg-slate-200" />
        </div>

        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-full bg-[#fafbff] border border-[#e8ebf8] rounded-xl"
          >
            <div className="flex items-center gap-3 p-3">
              <div className="size-10 rounded-full bg-slate-200 shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="h-3.5 w-32 rounded bg-slate-200" />
                <div className="h-3 w-44 rounded bg-slate-200" />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <div className="h-[22px] w-[72px] rounded-[20px] bg-slate-200" />
                <div className="size-6 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="self-stretch h-px bg-slate-100 shrink-0" />

      {/* Available Faculty section */}
      <div className="flex flex-col gap-2 py-5 items-start w-full">
        <div className="flex items-center gap-2 pb-1">
          <div className="h-5 w-[140px] rounded bg-slate-200" />
          <div className="h-5 w-8 rounded-[20px] bg-slate-200" />
        </div>

        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-full bg-white border border-[#e8ebf8] rounded-xl"
          >
            <div className="flex items-center gap-3 px-[15px] py-[13px]">
              <div className="size-10 rounded-full bg-slate-200 shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="h-3.5 w-28 rounded bg-slate-200" />
                <div className="h-3 w-36 rounded bg-slate-200" />
              </div>
              <div className="h-[30px] w-[70px] rounded-lg bg-slate-200 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
