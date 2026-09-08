// Skeletons for Archiving Milestone — student page + faculty table
// Style tokens per spec: bg #e8ebf8 animate-pulse, header font 11px uppercase, row h60

export function ArchivingSkeleton() {
  return (
    <div className="flex flex-col gap-[16px] w-full max-w-[968px] mx-auto animate-pulse">
      {/* StatusCallout skeleton — h78 rounded-14 */}
      <div className="h-[78px] rounded-[14px] border border-[#e8ebf8] bg-[#e8ebf8] w-full" />

      {/* Capstone Details Card skeleton — white border rounded-14 shadow */}
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_rgba(30,58,138,0.06)] flex flex-col overflow-hidden">
        {/* Header — Sora 12px #1e3a8a, h ~54px, border-b */}
        <div className="flex items-center gap-[10px] px-[30px] py-[14px] border-b border-[#f0f2fa] shrink-0">
          <div className="size-[26px] rounded-[8px] bg-[#e8ebf8] shrink-0" />
          <div className="h-[12px] w-[130px] rounded bg-[#e8ebf8]" />
        </div>

        {/* Form area — px30 py20 gap12, 5 field skeletons */}
        <div className="px-[30px] py-[20px] flex flex-col gap-[12px]">
          {/* Research Title — label 11px uppercase + input 37.5 + counter + pb10 */}
          <div className="flex flex-col gap-[6px] pb-[10px]">
            <div className="h-[11px] w-[110px] rounded bg-[#e8ebf8]" />
            <div className="h-[37.5px] w-full rounded-[8px] bg-[#e8ebf8]" />
            <div className="flex justify-between">
              <div className="h-[10px] w-[120px] rounded bg-[#e8ebf8]/60" />
              <div className="h-[10px] w-[50px] rounded bg-[#e8ebf8]/60" />
            </div>
          </div>

          {/* Abstract — label + textarea h140 + bottom bar */}
          <div className="flex flex-col gap-[6px] pb-[10px]">
            <div className="h-[11px] w-[80px] rounded bg-[#e8ebf8]" />
            <div className="h-[140px] w-full rounded-[9px] bg-[#e8ebf8]" />
            <div className="flex justify-between pt-[2px]">
              <div className="h-[10px] w-[160px] rounded bg-[#e8ebf8]/60" />
              <div className="h-[10px] w-[50px] rounded bg-[#e8ebf8]/60" />
            </div>
          </div>

          {/* Tags — label + chip input min-h37.5 */}
          <div className="flex flex-col gap-[6px] pb-[10px]">
            <div className="h-[11px] w-[50px] rounded bg-[#e8ebf8]" />
            <div className="min-h-[37.5px] w-full rounded-[8px] border border-[#e8ebf8] bg-[#e8ebf8]/50 flex items-center gap-[5px] px-[10px] py-[6px]">
              <div className="h-[23px] w-[60px] rounded-full bg-[#e8ebf8]" />
              <div className="h-[23px] w-[80px] rounded-full bg-[#e8ebf8]" />
              <div className="h-[23px] w-[55px] rounded-full bg-[#e8ebf8]" />
            </div>
          </div>

          {/* Authors — label + 2 row skeletons */}
          <div className="flex flex-col gap-[6px] pb-[10px]">
            <div className="h-[11px] w-[70px] rounded bg-[#e8ebf8]" />
            <div className="flex flex-col gap-[8px]">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-[10px] p-[12px] rounded-[10px] border border-[#e8ebf8] bg-white">
                  <div className="size-[22px] rounded-full bg-[#e8ebf8] shrink-0" />
                  <div className="flex-1 grid grid-cols-3 gap-[8px]">
                    <div className="h-[34px] rounded-[8px] bg-[#e8ebf8]" />
                    <div className="h-[34px] rounded-[8px] bg-[#e8ebf8]" />
                    <div className="h-[34px] rounded-[8px] bg-[#e8ebf8]" />
                  </div>
                  <div className="size-[26px] rounded-[8px] bg-[#e8ebf8] shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Upload Document — label + idle box h~130 */}
          <div className="flex flex-col gap-[6px] pb-[10px]">
            <div className="h-[11px] w-[150px] rounded bg-[#e8ebf8]" />
            <div className="h-[120px] w-full rounded-[10px] border border-[#e8ebf8] bg-[#e8ebf8]/40 flex flex-col items-center justify-center gap-[8px]">
              <div className="size-[48px] rounded-[24px] bg-[#e8ebf8]" />
              <div className="h-[12px] w-[180px] rounded bg-[#e8ebf8]" />
              <div className="h-[10px] w-[120px] rounded bg-[#e8ebf8]/60" />
            </div>
          </div>

          {/* Info callout skeleton */}
          <div className="h-[42px] w-full rounded-[10px] bg-[#e8ebf8]/50 border border-[#e8ebf8]" />
        </div>

        {/* Footer — 3 buttons */}
        <div className="border-t border-[#f0f2fa] px-[30px] py-[10px] flex justify-end gap-[10px] shrink-0 bg-white">
          <div className="h-[36px] w-[120px] rounded-[9px] bg-[#e8ebf8]" />
          <div className="h-[36px] w-[130px] rounded-[9px] bg-[#e8ebf8]" />
          <div className="h-[36px] w-[160px] rounded-[9px] bg-[#e8ebf8]" />
        </div>
      </div>
    </div>
  )
}

export function ChairReviewSkeleton() {
  const HEADER_LABELS = ['Group', 'Title', 'Date Submitted', 'Status', 'Action']
  const GRID_COLS = 'grid-cols-[1.2fr_2.2fr_0.9fr_0.7fr_110px]'

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col min-h-0 overflow-hidden animate-pulse">
      <div className="overflow-x-auto flex-1 min-h-0">
        <div className="min-w-[960px] flex flex-col min-h-full">
          {/* Header — h39 bg #fafbff, 11px uppercase #9ea8c6 */}
          <div className={`grid ${GRID_COLS} items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa] rounded-t-[14px]`}>
            {HEADER_LABELS.map((label) => (
              <span
                key={label}
                className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Rows — h60 border #f0f2fa — Section below Group */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`grid ${GRID_COLS} items-center px-[20px] h-[60px] border-b border-[#f0f2fa] last:border-b-0`}>
              <div className="pr-4 flex flex-col gap-1">
                <div className="h-[13px] w-[110px] rounded bg-[#e8ebf8]" />
                <div className="h-[11px] w-[80px] rounded bg-[#e8ebf8]/70" />
              </div>
              <div className="pr-4">
                <div className="h-[12px] w-[140px] rounded bg-[#e8ebf8]" />
              </div>
              <div className="pr-4">
                <div className="h-[12px] w-[80px] rounded bg-[#e8ebf8]" />
              </div>
              <div className="pr-4">
                <div className="h-[22px] w-[70px] rounded-[7px] bg-[#e8ebf8]" />
              </div>
              <div className="flex items-center justify-end gap-[6px]">
                <div className="size-[30px] rounded-md bg-[#e8ebf8] border border-[#e8ebf8]" />
                <div className="size-[30px] rounded-md bg-[#e8ebf8] border border-[#e8ebf8]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ArchivingSkeleton
