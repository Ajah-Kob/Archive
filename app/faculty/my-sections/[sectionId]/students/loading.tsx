import { StudentTableSkeleton } from '@/components/sections/students/StudentTableSkeleton'
import { ScrollFadeRegion } from '@/components/ui/ScrollFadeRegion'

const BAR = 'bg-[#dfe3fb]'

export default function SectionStudentsLoading() {
  return (
    <div className="flex flex-col flex-1 min-h-0 animate-pulse">
      {/* Single line, mirroring the real StudentsActionBar: search and filter
          scroll sideways instead of wrapping. */}
      <div className="w-full flex flex-nowrap items-center gap-x-[16px] px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
        <ScrollFadeRegion className="flex items-center gap-2.5 flex-1">
          <div className={`h-[37.5px] w-[280px] sm:w-[320px] shrink-0 rounded-lg ${BAR}`} />
          <div className={`h-[37.5px] w-[148px] shrink-0 rounded-lg ${BAR}`} />
        </ScrollFadeRegion>
      </div>

      <div className="flex-1 min-h-0 px-4 py-4 sm:px-8 flex flex-col">
        <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-full">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <StudentTableSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}