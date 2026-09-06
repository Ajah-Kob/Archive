import { FacultyTableSkeleton } from '@/components/faculty/FacultyTableSkeleton'

export default function FacultyLoading() {
  return (
    <section className="h-full flex flex-col">
      <div className="flex-1 min-h-0 pt-[16px] px-8 pb-[30px] flex flex-col">
        <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0 overflow-hidden">
          <FacultyTableSkeleton />
        </div>
      </div>
    </section>
  )
}
