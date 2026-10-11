/**
 * Streaming fallback for the section topics route.
 *
 * The page redirects to /overview immediately, so this never paints — a small
 * topic-card grid with a status rail nodding at the topics shape is enough to
 * avoid a flash on the redirect. Empty fixed-width blocks only — no text.
 */
function TopicCardSkeleton() {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06)] p-[20px] flex flex-col gap-[12px]">
      <div className="h-[15px] w-[75%] rounded bg-slate-200" />
      <div className="h-[12px] w-[45%] rounded bg-[#e8ebf8]" />
      <div className="flex flex-col gap-[7px]">
        <div className="h-[12px] w-full rounded bg-[#e8ebf8]" />
        <div className="h-[12px] w-[85%] rounded bg-[#e8ebf8]" />
      </div>
      <div className="flex items-center justify-between gap-[10px] pt-[4px]">
        <div className="h-[22px] w-[90px] rounded-full bg-[#e8ebf8]" />
        <div className="h-[32px] w-[96px] rounded-[8px] bg-slate-200" />
      </div>
    </div>
  )
}

export default function SectionTopicsLoading() {
  return (
    <div aria-hidden="true" className="flex flex-col flex-1 min-h-0 animate-pulse">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <TopicCardSkeleton key={i} />
          ))}
        </div>
        {/* Status rail. */}
        <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06)] p-[20px] flex flex-col gap-[12px] h-fit">
          <div className="h-[14px] w-28 rounded bg-slate-200" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-[11px] w-[74px] rounded bg-[#e8ebf8] shrink-0" />
              <div className="flex-1 h-[6px] rounded-[3px] bg-[#e8ebf8] min-w-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
