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

      <div className="flex-1 min-h-0 px-4 py-4 sm:px-8 flex flex-col gap-[12px]">
        {/* Bulk-control row — mirrors the select-all and delete controls that
            sit above the loaded table. */}
        <div className="flex items-center gap-[10px] h-[32px]">
          <div className={`size-4 rounded ${BAR}`} />
          <div className={`h-[10px] w-16 rounded ${BAR}`} />
        </div>

        {/* The skeleton owns its own white panel, matching StudentsTable, so
            nothing wraps it in a second one. */}
        <StudentTableSkeleton />
      </div>
    </div>
  )
}