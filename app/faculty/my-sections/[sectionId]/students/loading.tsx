import { StudentTableSkeleton } from '@/components/sections/students/StudentTableSkeleton'

const BAR = 'bg-[#e8ebf8]'

export default function SectionStudentsLoading() {
  return (
    <div className="flex flex-col flex-1 min-h-0 animate-pulse">
      <div className="w-full flex flex-wrap items-center gap-x-[16px] gap-y-[10px] px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className={`h-[37.5px] w-[320px] max-w-[320px] min-w-[180px] rounded-lg ${BAR}`} />
          <div className={`h-[37.5px] w-[148px] rounded-lg ${BAR}`} />
        </div>
      </div>

      <div className="flex-1 min-h-0 px-8 py-4 flex flex-col">
        <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-full">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <StudentTableSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}
