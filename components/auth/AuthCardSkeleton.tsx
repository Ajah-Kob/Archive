const BAR = 'bg-[#e8ebf8]'

// Shimmer placeholder mirroring the unified auth card (420px, same padding,
// radius, and shadow). `fields` matches the form's input count per route.
export function AuthCardSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <main className="w-full max-w-[420px] flex flex-col gap-5 items-center relative z-10">
      <div className="w-full p-6 md:p-8 rounded-3xl bg-[#ffffff] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.03),0px_20px_60px_-4px_rgba(112,125,255,0.16),0px_0px_0px_1px_rgba(112,125,255,0.06)] flex flex-col gap-5 animate-pulse">
        <div className="flex flex-col gap-2">
          <div className={`h-6 w-48 rounded ${BAR}`} />
          <div className={`h-[13px] w-64 rounded ${BAR}`} />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className={`h-3 w-20 rounded ${BAR}`} />
              <div className={`h-[38px] rounded-xl ${BAR}`} />
            </div>
          ))}
          <div className={`h-[38px] rounded-[7px] ${BAR}`} />
        </div>
      </div>
      <div className={`h-4 w-44 rounded ${BAR} animate-pulse`} />
    </main>
  )
}
