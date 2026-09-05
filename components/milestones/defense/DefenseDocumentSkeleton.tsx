'use client'

/**
 * Loading skeleton for the Defense Document Card.
 *
 * Shown while the page re-fetches after a document is submitted/replaced, so
 * the card never flashes back to the idle upload state. Mirrors the card's
 * frame + header and renders placeholder bars for the document timeline.
 */
export function DefenseDocumentSkeleton() {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden animate-pulse">
      {/* Header — skeleton, no solid label */}
      <div className="flex items-center gap-[8px] px-[16px] pt-[12px] pb-[13px] border-b border-[#f0f2fa]">
        <div className="size-[26px] rounded-[7px] bg-slate-200 shrink-0" />
        <div className="h-[12px] w-[130px] rounded bg-slate-200" />
      </div>

      {/* Body */}
      <div className="p-[14px] flex flex-col gap-[14px]">
        {/* Timeline row placeholder */}
        <div className="flex gap-[14px] items-start">
          <div className="size-[15px] rounded-full bg-slate-200 shrink-0 mt-[2px]" />
          <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
            <div className="h-[13px] w-[55%] rounded bg-slate-200" />
            <div className="h-[12px] w-[75%] rounded bg-slate-200" />
            <div className="h-[12px] w-[40%] rounded bg-slate-200" />
          </div>
          <div className="flex gap-[10px] shrink-0">
            <div className="h-[32px] w-[74px] rounded-[8px] bg-slate-200" />
            <div className="h-[32px] w-[80px] rounded-[8px] bg-slate-200" />
          </div>
        </div>

        {/* Upload zone placeholder */}
        <div className="flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[#d0d5ea] bg-[#fafbff] px-[30px] py-[22px]">
          <div className="size-[48px] rounded-[24px] bg-slate-200" />
          <div className="mt-[14px] h-[14px] w-[220px] rounded bg-slate-200" />
          <div className="mt-[10px] h-[32px] w-[130px] rounded-[9px] bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
