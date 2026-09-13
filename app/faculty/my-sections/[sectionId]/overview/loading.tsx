const BAR = 'bg-[#e8ebf8]'

export default function SectionOverviewLoading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full animate-pulse">
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col items-start pb-[15px] pt-[20px] px-[20px] w-full">
          <div className={`h-[20px] w-48 rounded ${BAR}`} />
        </div>
        <div className="px-[20px] py-[15px] flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <div className={`h-[13px] w-32 rounded ${BAR}`} />
          <div className={`h-[13px] w-36 rounded ${BAR}`} />
        </div>
      </div>
    </div>
  )
}
